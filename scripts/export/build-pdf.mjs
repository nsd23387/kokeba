#!/usr/bin/env node
// Kokeba export — KDP-structured print files via headless Chromium (fonts embedded):
//   interior.pdf  — single interior pages at trim+bleed (NOT spreads)
//   cover.pdf     — full wrap: back + spine + front, spine sized from page count
//   book.pdf      — the spread proof (for human review)
// Falls back to clear instructions if puppeteer isn't installed.
//
// Usage: node scripts/export/build-pdf.mjs <book-dir>

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const bookDir = process.argv[2];
if (!bookDir) { console.error("Usage: node scripts/export/build-pdf.mjs <book-dir>"); process.exit(2); }
const abs = path.resolve(bookDir);
const L = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const buildBook = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../layout/build-book.mjs");

// (re)build both proof.html (spreads) and proof-print.html (single pages)
execFileSync("node", [buildBook, bookDir, "--single"], { stdio: "inherit" });

const m = String(L.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)\s*([a-z]+)/i);
const trimW = m ? parseFloat(m[1]) : 8.5, trimH = m ? parseFloat(m[2]) : 8.5, unit = m ? m[3] : "in";
const bleed = Number(L.bleed_in || 0.125);
// spine = interior page count x paper thickness (white)
const storySpreads = L.pages.filter((p) => /^\d+$/.test(p.page) && p.image).length;
const otherInterior = L.pages.filter((p) => p.page !== "cover" && !/^\d+$/.test(p.page)).length;
const interiorPages = storySpreads * 2 + otherInterior;
const spine = interiorPages * 0.002252;
const cover = L.pages.find((p) => p.page === "cover");

let puppeteer;
try { puppeteer = (await import("puppeteer")).default; }
catch {
  console.log("\nHeadless export needs Puppeteer (not installed).");
  console.log("  Install once:  npm i -D puppeteer");
  console.log("  Or open proof.html / proof-print.html and Print → Save as PDF.");
  console.log(`\nKDP plan: interior ${interiorPages}pp single pages at ${trimW}x${trimH}${unit}; cover wrap spine ${spine.toFixed(3)}in.`);
  process.exit(0);
}

// cover wrap html: [bleed | back trimW | spine | front trimW | bleed] x [bleed | trimH | bleed]
const wrapW = (2 * bleed + 2 * trimW + spine).toFixed(3);
const wrapH = (2 * bleed + trimH).toFixed(3);
const coverImg = cover && fs.existsSync(path.join(abs, L.art_dir || "art", cover.image)) ? `${L.art_dir || "art"}/${cover.image}` : null;
const wrapHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Noto+Sans+Ethiopic:wght@700&display=swap" rel="stylesheet">
<style>@page{size:${wrapW}${unit} ${wrapH}${unit};margin:0}*{margin:0;box-sizing:border-box}
.wrap{display:flex;width:${wrapW}${unit};height:${wrapH}${unit}}
.back{width:${(bleed + trimW).toFixed(3)}${unit};height:100%;background:#FBF7EC;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8%;text-align:center;color:#222B6D;font-family:'Fraunces',serif}
.spine{width:${spine.toFixed(3)}${unit};height:100%;background:#222B6D}
.front{width:${(bleed + trimW).toFixed(3)}${unit};height:100%;position:relative;overflow:hidden;background:#FFFDF7}
.front img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.title{position:absolute;left:8%;right:8%;top:6%;text-align:center;background:rgba(255,253,247,.9);border:1px solid rgba(201,162,39,.6);border-radius:14px;padding:10px}
.t-en{color:#222B6D;font-family:'Fraunces',serif;font-weight:500;font-size:26px}.t-am{font-family:'Noto Sans Ethiopic',serif;color:#9A7D1E;font-weight:700;font-size:18px;margin-top:4px}
.star{color:#C9A227;font-size:20px}.blurb{font-size:13px;color:#6b6f86;margin-top:10px}
</style></head><body><div class="wrap">
<div class="back"><div class="star">★</div><div style="font-weight:500;font-size:18px;margin-top:6px">Kokeba</div><div class="blurb">A story for every little star.</div></div>
<div class="spine"></div>
<div class="front">${coverImg ? `<img src="${coverImg}">` : ""}<div class="title"><div class="star">★</div><div class="t-en">${cover?.title_en || ""}</div><div class="t-am">${cover?.title_am || ""}</div></div></div>
</div></body></html>`;
const wrapPath = path.join(abs, "cover-wrap.html");
fs.writeFileSync(wrapPath, wrapHtml);

const browser = await puppeteer.launch({ headless: "new" });
async function render(file, out, w, h) {
  const pg = await browser.newPage();
  await pg.goto("file://" + file, { waitUntil: "networkidle0" });
  await pg.evaluateHandle("document.fonts.ready");
  await pg.pdf({ path: out, printBackground: true, width: `${w}${unit}`, height: `${h}${unit}`, pageRanges: out.includes("cover") ? "1" : undefined });
  await pg.close();
}
const tb = (trimW + 2 * bleed).toFixed(3), hb = (trimH + 2 * bleed).toFixed(3);
await render(path.join(abs, "proof-print.html"), path.join(abs, "interior.pdf"), tb, hb);
await render(wrapPath, path.join(abs, "cover.pdf"), wrapW, wrapH);
await render(path.join(abs, "proof.html"), path.join(abs, "book.pdf"), tb, hb);
await browser.close();
console.log(`Wrote interior.pdf (${interiorPages}pp ${tb}x${hb}${unit}), cover.pdf (wrap ${wrapW}x${wrapH}${unit}, spine ${spine.toFixed(3)}${unit}), book.pdf (proof).`);
