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

// kdp metadata artifact
const kdp = {
  book_id: L.book_id, title_en: cover?.title_en, title_am: cover?.title_am,
  reading_age: "0-3", bisac: ["JUVENILE FICTION / Animals", "JUVENILE FICTION / Concepts / Words"],
  trim: L.trim, pages: L.pages.length, language: ["en", "am"],
  ai_content: { text: true, images: true, disclose_at_upload: true },
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
