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
import os from "node:os";
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
const pubExists = fs.existsSync(path.join(abs, "publishing.json"));
const pub = pubExists ? JSON.parse(fs.readFileSync(path.join(abs, "publishing.json"), "utf8")) : null;
const frontBack = pub ? 2 + (pub.about ? 1 : 0) : 0; // title + copyright (+ about) — must match the rendered interior
const interiorPages = storySpreads * 2 + otherInterior + frontBack;
const spine = interiorPages * 0.002252;
const cover = L.pages.find((p) => p.page === "cover");
const artDir = L.art_dir || "art";
let renderAsset = (src) => src;

try {
  const sharp = (await import("sharp")).default;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kokeba-pdf-assets-"));
  const converted = new Map();
  for (const p of L.pages.filter((page) => page.image)) {
    const rel = `${artDir}/${p.image}`;
    const src = path.join(abs, artDir, p.image);
    if (!fs.existsSync(src) || converted.has(rel)) continue;
    const out = path.join(tmpDir, p.image.replace(/\.[^.]+$/, ".jpg"));
    await sharp(src).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
    converted.set(rel, `file://${out}`);
  }
  renderAsset = (src) => converted.get(src) || src;
  for (const file of ["proof-print.html", "proof.html"]) {
    const htmlPath = path.join(abs, file);
    if (!fs.existsSync(htmlPath)) continue;
    let html = fs.readFileSync(htmlPath, "utf8");
    for (const [src, out] of converted) html = html.replaceAll(src, out);
    fs.writeFileSync(path.join(tmpDir, file), html);
  }
  console.log(`Prepared compressed PDF render assets (${converted.size} image(s), JPEG q88).`);
  var printHtmlForPdf = path.join(tmpDir, "proof-print.html");
  var proofHtmlForPdf = path.join(tmpDir, "proof.html");
} catch {
  var printHtmlForPdf = path.join(abs, "proof-print.html");
  var proofHtmlForPdf = path.join(abs, "proof.html");
}

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
const coverImg = cover && fs.existsSync(path.join(abs, artDir, cover.image)) ? renderAsset(`${artDir}/${cover.image}`) : null;
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
await render(printHtmlForPdf, path.join(abs, "interior.pdf"), tb, hb);
await render(wrapPath, path.join(abs, "cover.pdf"), wrapW, wrapH);
await render(proofHtmlForPdf, path.join(abs, "book.pdf"), tb, hb);
await browser.close();
console.log(`Wrote interior.pdf (${interiorPages}pp ${tb}x${hb}${unit}), cover.pdf (wrap ${wrapW}x${wrapH}${unit}, spine ${spine.toFixed(3)}${unit}), book.pdf (proof).`);

// titled, shareable copies (canonical names kept for the validator/pipeline)
const safe = String(cover?.title_en || L.book_id).replace(/[\\/:*?"<>|]/g, "").trim();
for (const [src, suf] of [["interior.pdf", " - interior.pdf"], ["cover.pdf", " - cover.pdf"], ["book.pdf", ".pdf"]]) {
  try { fs.copyFileSync(path.join(abs, src), path.join(abs, safe + suf)); } catch {}
}
console.log(`Titled copies: "${safe} - interior.pdf", "${safe} - cover.pdf", "${safe}.pdf"`);
