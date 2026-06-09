#!/usr/bin/env node
// Kokeba Proof Reader — automated pre-export QA. Renders the print proof headlessly and
// measures EVERY text element against KDP's trim/safe margins, catching glosses, words, or
// titles that would be clipped at the cut line — BEFORE the final PDF is generated. Also
// flags duplicate front-matter text (e.g., author == imprint echoed twice).
//
// This is the geometric backstop for exactly the issues a human spots in KDP's previewer.
// Hard-gates export: exit 1 (FAIL) means "do not export — fix the layout first."
//
// Usage: node scripts/proofread/check-proof.mjs <book-dir> [--json] [--safe 0.25]
// Needs: proof-print.html (auto-built if missing) + puppeteer.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
const safeArg = (() => { const i = process.argv.indexOf("--safe"); return i >= 0 ? parseFloat(process.argv[i + 1]) : 0.25; })();
if (!bookDir) { console.error("Usage: node scripts/proofread/check-proof.mjs <book-dir> [--json] [--safe 0.25]"); process.exit(2); }

const abs = path.resolve(bookDir);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const L = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const tm = String(L.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)/);
const trimW = tm ? +tm[1] : 8.5, trimH = tm ? +tm[2] : 8.5;
const bleed = L.bleed_in ?? 0.125;
const safeFromEdgeIn = bleed + safeArg; // text must stay at least this far from the physical page edge

const proofPath = path.join(abs, "proof-print.html");
if (!fs.existsSync(proofPath)) {
  try { execFileSync("node", [path.join(REPO, "scripts/layout/build-book.mjs"), abs, "--single"], { cwd: REPO, stdio: "ignore" }); } catch {}
}
if (!fs.existsSync(proofPath)) { console.error(`No proof-print.html — run: npm run render -- ${bookDir} --single`); process.exit(2); }

let puppeteer;
try { ({ default: puppeteer } = await import("puppeteer")); }
catch { console.error("puppeteer not installed (npm i -D puppeteer)"); process.exit(2); }

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.goto("file://" + proofPath, { waitUntil: "networkidle0", timeout: 60000 });
try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}

const TEXT_SEL = ".rhyme,.prompt,.word,.translit,.gloss,.fidel-big,.fidel-sound,.fidel-for,.centered,.r-title,.r-sub,.r-en,.r-tr,.r-am,.fm-title,.fm-title-am,.fm-by,.fm-imprint,.about,.fm-contact,.cp-box";

const result = await page.evaluate((sel, safeIn, bleedIn) => {
  const DPI = 96;
  const safePx = safeIn * DPI;
  const trimPx = bleedIn * DPI;
  const sheets = [...document.querySelectorAll(".sheet")];
  const flags = [];
  sheets.forEach((sheet, i) => {
    const sr = sheet.getBoundingClientRect();
    [...sheet.querySelectorAll(sel)].forEach((el) => {
      const t = (el.textContent || "").trim();
      if (!t) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return; // hidden (e.g. page numbers in print)
      const ins = { left: r.left - sr.left, right: sr.right - r.right, top: r.top - sr.top, bottom: sr.bottom - r.bottom };
      const minInset = Math.min(ins.left, ins.right, ins.top, ins.bottom);
      if (minInset < safePx) {
        const edges = Object.entries(ins).filter(([, v]) => v < safePx).map(([k, v]) => `${k} ${(v / DPI).toFixed(3)}in`);
        flags.push({ page: i + 1, cls: [...el.classList].join("."), text: t.slice(0, 40), level: "fail", past_trim: minInset < trimPx, edges, min_inset_in: +(minInset / DPI).toFixed(3) });
      }
    });
    // duplicate front-matter text (normalize a leading "by " so "by X" and "X" match)
    const seen = {};
    [...sheet.querySelectorAll(sel)].forEach((el) => {
      const key = (el.textContent || "").trim().replace(/^by\s+/i, "");
      if (!key) return;
      if (seen[key]) flags.push({ page: i + 1, level: "warn", text: key.slice(0, 40), issue: "duplicate text on page" });
      seen[key] = 1;
    });
  });
  return { sheets: sheets.length, flags };
}, TEXT_SEL, safeFromEdgeIn, bleed);

await browser.close();

const fail = result.flags.filter((f) => f.level === "fail").length;
const warn = result.flags.filter((f) => f.level === "warn").length;
const report = {
  book_id: L.book_id, trim: `${trimW}x${trimH}in`, bleed, safe_from_edge_in: +safeFromEdgeIn.toFixed(3),
  pages: result.sheets, counts: { fail, warn, pass: Math.max(0, result.sheets - fail) }, ok: fail === 0, flags: result.flags,
};
fs.writeFileSync(path.join(abs, "proof-report.json"), JSON.stringify(report, null, 2));

if (JSON_OUT) console.log(JSON.stringify(report));
else {
  console.log(`\nKokeba Proof Reader — ${L.book_id}  (${trimW}x${trimH}in · text safe ≥ ${safeFromEdgeIn.toFixed(3)}in from edge)`);
  console.log(`  ${result.sheets} pages · ${fail} fail · ${warn} warn`);
  result.flags.forEach((f) => console.log(`  ${f.level === "fail" ? "✗" : "⚠"} p${f.page} ${f.issue ? `${f.issue}: "${f.text}"` : `"${f.text}" [${f.cls}] too close to edge (${(f.edges || []).join(", ")})`}`));
  if (!result.flags.length) console.log("  ✓ all text sits inside the KDP safe margins");
  console.log("  → wrote proof-report.json");
}
process.exit(fail > 0 ? 1 : 0);
