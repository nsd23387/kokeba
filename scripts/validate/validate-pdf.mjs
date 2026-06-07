#!/usr/bin/env node
// Kokeba final-PDF validator — checks the EXPORTED PDFs against KDP before upload:
//   interior.pdf — page dimensions = trim + bleed, page count >= 24, fonts embedded
//   cover.pdf    — dimensions = wrap (back+spine+front) + bleed, fonts embedded
// Lightweight (regex on the PDF), no deps. Catches the common upload rejections.
//
// Usage: node scripts/validate/validate-pdf.mjs <book-dir> [--json]
// Exit 1 if any FAIL.

import fs from "node:fs";
import path from "node:path";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
if (!bookDir) { console.error("Usage: node scripts/validate/validate-pdf.mjs <book-dir> [--json]"); process.exit(2); }
const L = JSON.parse(fs.readFileSync(path.resolve(bookDir, "layout.json"), "utf8"));
const tm = String(L.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)/);
const trimW = tm ? parseFloat(tm[1]) : 8.5, trimH = tm ? parseFloat(tm[2]) : 8.5;
const bleed = Number(L.bleed_in || 0.125);
const storySpreads = L.pages.filter((p) => /^\d+$/.test(p.page) && p.image).length;
const otherInterior = L.pages.filter((p) => p.page !== "cover" && !/^\d+$/.test(p.page)).length;
const pubExists = fs.existsSync(path.resolve(bookDir, "publishing.json"));
const interiorPages = storySpreads * 2 + otherInterior + (pubExists ? 3 : 0);
const spine = interiorPages * 0.002252;

const flags = [];
const add = (level, file, check, msg) => flags.push({ level, file, check, msg });
const near = (a, b, tol = 0.06) => a != null && Math.abs(a - b) <= tol;

function inspect(file, expW, expH, { minPages } = {}) {
  const fp = path.resolve(bookDir, file);
  if (!fs.existsSync(fp)) { add("warn", file, "exists", "not exported yet (run Export)"); return; }
  const buf = fs.readFileSync(fp, "latin1");
  const mb = buf.match(/\/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*\]/);
  const wIn = mb ? (parseFloat(mb[3]) - parseFloat(mb[1])) / 72 : null;
  const hIn = mb ? (parseFloat(mb[4]) - parseFloat(mb[2])) / 72 : null;
  add(near(wIn, expW) && near(hIn, expH) ? "ok" : "fail", file, "dimensions",
    mb ? `${wIn?.toFixed(3)}x${hIn?.toFixed(3)}in (expected ${expW.toFixed(3)}x${expH.toFixed(3)})` : "no MediaBox found");
  const pages = (buf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (minPages) add(pages >= minPages ? "ok" : "fail", file, "page count", `${pages} pages (KDP min ${minPages})`);
  const hasFont = /\/BaseFont\b/.test(buf), embedded = /\/FontFile\d?\b/.test(buf);
  add(!hasFont || embedded ? "ok" : "fail", file, "fonts embedded", hasFont ? (embedded ? "fonts embedded" : "FONTS NOT EMBEDDED — KDP will reject (esp. fidel)") : "no text fonts (image-only)");
}

inspect("interior.pdf", trimW + 2 * bleed, trimH + 2 * bleed, { minPages: 24 });
inspect("cover.pdf", 2 * bleed + 2 * trimW + spine, 2 * bleed + trimH, {});

const fail = flags.filter((f) => f.level === "fail");
const warn = flags.filter((f) => f.level === "warn");
if (JSON_OUT) console.log(JSON.stringify({ ok: fail.length === 0, counts: { fail: fail.length, warn: warn.length, pass: flags.filter((f) => f.level === "ok").length }, flags }));
else {
  console.log(`\nKokeba PDF validation — ${fail.length} fail · ${warn.length} warn`);
  for (const f of flags) console.log(`  ${f.level === "fail" ? "✗" : f.level === "warn" ? "⚠" : "✓"} [${f.file}] ${f.check}: ${f.msg}`);
}
process.exit(fail.length ? 1 : 0);
