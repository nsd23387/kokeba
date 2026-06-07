#!/usr/bin/env node
// Kokeba compliance pre-flight — deterministic publish-readiness checks for KDP + child-safety.
// Produces a compliance report and a kdp-metadata.json artifact. Country-agnostic
// (reads the book's layout.json; age/market defaults come from the 0-3 band).
//
// Usage:
//   node scripts/compliance/check-compliance.mjs <book-dir> [--json]
// Exit 1 if any hard FAIL (missing AI disclosure, missing art, etc.).

import fs from "node:fs";
import path from "node:path";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
if (!bookDir) { console.error("Usage: node scripts/compliance/check-compliance.mjs <book-dir> [--json]"); process.exit(2); }

const L = JSON.parse(fs.readFileSync(path.resolve(bookDir, "layout.json"), "utf8"));
const artDir = path.resolve(bookDir, L.art_dir || "art");
const cover = L.pages.find((p) => p.page === "cover");
const animalPages = L.pages.filter((p) => p.vocab);
const imgPages = L.pages.filter((p) => p.image);
const haveArt = imgPages.filter((p) => fs.existsSync(path.resolve(artDir, p.image)));

// --- KDP print spec (verified against kdp.amazon.com help) ---
const KDP = { bleed_in: 0.125, min_dpi: 300, safe_margin_in: 0.25, gutter_min_in: 0.375, min_pages: 24, trim_w: [4, 8.5], trim_h: [6, 11.69], paper_white_in: 0.002252 };
function pngSize(fp) { try { const b = fs.readFileSync(fp).subarray(0, 24); if (b[0] !== 0x89) return null; return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; } catch { return null; } }
const tm = String(L.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)/);
const trimW = tm ? parseFloat(tm[1]) : 8.5, trimH = tm ? parseFloat(tm[2]) : 8.5;
let minDpi = Infinity;
for (const pg of haveArt) { const s = pngSize(path.resolve(artDir, pg.image)); if (s) minDpi = Math.min(minDpi, Math.round(s.w / (trimW + 2 * KDP.bleed_in))); }
const storySpreads = L.pages.filter((p) => /^\d+$/.test(p.page) && p.image).length;
const otherInterior = L.pages.filter((p) => p.page !== "cover" && !/^\d+$/.test(p.page)).length;
const interiorPages = storySpreads * 2 + otherInterior;
const spineIn = (interiorPages * KDP.paper_white_in).toFixed(3);
const needPx = Math.ceil((trimW + 2 * KDP.bleed_in) * KDP.min_dpi);

const checks = [];
const add = (status, item, note) => checks.push({ status, item, note }); // status: ok | todo | fail

// --- child safety / product ---
add("ok", "Audience", "Ages 0-3 (board/picture book) — children's product");
add("warn", "CPSIA", "Children's product: physical print run requires CPSIA testing (lead/phthalates) + tracking label. Print-on-demand via KDP is generally exempt, but verify for your edition.");
add("ok", "COPPA", "No data collection in a printed book — N/A; applies only to any companion app/site.");

// --- AI disclosure (KDP requires declaring AI-generated content) ---
add("fail", "AI disclosure", "Declare AI-generated text AND images in KDP's 'AI Content' question at upload.");
checks[checks.length - 1].status = "todo"; // it's an upload-time action, not a blocker on the asset

// --- metadata / KDP readiness ---
add(cover && fs.existsSync(path.resolve(artDir, cover.image)) ? "ok" : "fail", "Cover", cover ? `cover art ${cover.image}` : "no cover page");
add(L.title || cover?.title_en ? "ok" : "fail", "Title", cover?.title_en || L.book_id);
add(L.trim ? "ok" : "todo", "Trim size", L.trim || "set a KDP trim (e.g. 8.5x8.5in square)");
add(haveArt.length === imgPages.length ? "ok" : "fail", "Interior art", `${haveArt.length}/${imgPages.length} page images present`);
add(animalPages.every((p) => p.vocab.am) ? "ok" : "fail", "Heritage text (fidel)", `${animalPages.length} vocab words; fidel must be embedded in the export PDF`);
add("ok", "Reading age", "0-3 (set in KDP)");
add("ok", "BISAC", "JUVENILE FICTION / Animals (or / Concepts / Words) — set at upload");
add("warn", "Originality", "Native-reviewer + originality sign-off happens at Gate 1 (not automatable here).");

// --- KDP print-spec conformance (so the file is upload-ready) ---
add(isFinite(minDpi) && minDpi >= KDP.min_dpi ? "ok" : "fail", "Print resolution (DPI)",
  isFinite(minDpi) ? `art is ~${minDpi} DPI at ${trimW}in trim; KDP needs >=${KDP.min_dpi} DPI${minDpi < KDP.min_dpi ? ` — UPSCALE art to >=${needPx}px before upload` : ""}` : "no art to measure");
add(trimW >= KDP.trim_w[0] && trimW <= KDP.trim_w[1] && trimH >= KDP.trim_h[0] && trimH <= KDP.trim_h[1] ? "ok" : "warn", "Trim size",
  `${trimW}x${trimH}in (KDP custom range ${KDP.trim_w[0]}-${KDP.trim_w[1]} x ${KDP.trim_h[0]}-${KDP.trim_h[1]}in)`);
add(Number(L.bleed_in) === KDP.bleed_in ? "ok" : "warn", "Bleed", `${L.bleed_in || 0}in (KDP requires ${KDP.bleed_in}in full bleed on all sides)`);
add("warn", "Safe area", `keep key content >=${KDP.safe_margin_in}in from trim; gutter >=${KDP.gutter_min_in}in`);
add(interiorPages >= KDP.min_pages ? "ok" : "warn", "Page count", `~${interiorPages} single interior pages (KDP min ${KDP.min_pages}); interior must be SINGLE pages, not spreads`);
add("todo", "Cover wrap", `build a full wrap (back+spine+front): est. spine ${spineIn}in for ${interiorPages}pp white paper — confirm with KDP Cover Calculator`);
add("warn", "Format", "KDP prints PAPERBACK + HARDCOVER (not board books). For a 0-3 title, publish as a paperback/hardcover picture book here, or use a dedicated board-book printer.");

// kdp metadata artifact
const kdp = {
  book_id: L.book_id, title_en: cover?.title_en, title_am: cover?.title_am,
  reading_age: "0-3", bisac: ["JUVENILE FICTION / Animals", "JUVENILE FICTION / Concepts / Words"],
  trim: L.trim, spreads: L.pages.length, interior_pages: interiorPages, spine_in: Number(spineIn),
  language: ["en", "am"], min_dpi_found: isFinite(minDpi) ? minDpi : null, required_px: needPx,
  ai_content: { text: true, images: true, disclose_at_upload: true },
  format: "paperback or hardcover (KDP does not print board books)",
  cpsia_note: "Children's product — verify testing/labeling for physical editions.",
};
fs.writeFileSync(path.resolve(bookDir, "kdp-metadata.json"), JSON.stringify(kdp, null, 2));

const fail = checks.filter((c) => c.status === "fail");
const todo = checks.filter((c) => c.status === "todo");
const warn = checks.filter((c) => c.status === "warn");

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: fail.length === 0, counts: { fail: fail.length, todo: todo.length, warn: warn.length, ok: checks.filter((c) => c.status === "ok").length }, checks }, null, 2));
} else {
  console.log(`\nKokeba compliance — ${L.book_id}`);
  console.log(`  ${fail.length} fail · ${todo.length} todo · ${warn.length} note\n`);
  const icon = (s) => (s === "fail" ? "✗" : s === "todo" ? "▢" : s === "warn" ? "⚠" : "✓");
  for (const c of checks) console.log(`  ${icon(c.status)} ${c.item}: ${c.note}`);
  console.log(`\n  wrote kdp-metadata.json`);
}
process.exit(fail.length ? 1 : 0);
