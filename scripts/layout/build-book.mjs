#!/usr/bin/env node
// Kokeba — book renderer.
// Reads a book's layout.json + art/ and writes a print-ready proof.html that matches
// the APPROVED square template (left page = English story; right page = full-bleed
// illustration with the Amharic vocab in an overlay band over the text-safe zone).
// Fidel renders via Noto Sans Ethiopic and embeds when you Print -> Save as PDF.
//
// Usage:
//   node scripts/layout/build-book.mjs <book-dir>
//   node scripts/layout/build-book.mjs content/examples/ethiopia-0-3/eden-goes-to-the-zoo
//
// Output: <book-dir>/proof.html  (open in a browser; Print -> Save as PDF for the book).

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const bookDir = process.argv[2];
if (!bookDir) {
  console.error("Usage: node scripts/layout/build-book.mjs <book-dir>");
  process.exit(1);
}
const layoutPath = path.resolve(bookDir, "layout.json");
if (!fs.existsSync(layoutPath)) {
  console.error(`No layout.json at ${layoutPath}`);
  process.exit(1);
}
const L = JSON.parse(fs.readFileSync(layoutPath, "utf8"));
const artDir = L.art_dir || "art";
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nl2br = (s = "") => esc(s).replace(/\n/g, "<br>");

function imgTag(file, alt) {
  if (!file) return `<div class="ph">no image</div>`;
  const abs = path.resolve(bookDir, artDir, file);
  if (!fs.existsSync(abs)) return `<div class="ph">missing: ${esc(file)}</div>`;
  return `<img src="${esc(artDir)}/${esc(file)}" alt="${esc(alt || "")}">`;
}

function textPage(p) {
  const prompt = p.interaction ? `<div class="prompt">${esc(p.interaction)}</div>` : "";
  const num = /^\d+$/.test(p.page) ? `<div class="pg">${esc(p.page)}</div>` : "";
  return `<div class="page L"><div class="star">&#9733;</div>
    <div class="rhyme">${nl2br(p.english)}</div>${prompt}${num}</div>`;
}
function imagePage(p) {
  let band = "";
  if (p.vocab) {
    band = `<div class="band"><div class="word">${esc(p.vocab.am)}</div>
      <div class="translit">${esc(p.vocab.translit)}</div>
      <div class="gloss">${esc(p.vocab.en)}</div></div>`;
  }
  return `<div class="page R">${imgTag(p.image, p.vocab ? p.vocab.en : p.page)}${band}</div>`;
}
function spread(p) {
  return `<div class="spread">${textPage(p)}<div class="spine"></div>${imagePage(p)}</div>`;
}
function coverPage(p) {
  return `<div class="single cover">${imgTag(p.image, "cover")}
    <div class="cover-title"><div class="ct-en">${esc(p.title_en || "")}</div>
    <div class="ct-am">${esc(p.title_am || "")}</div></div></div>`;
}
function centeredPage(p, cls) {
  return `<div class="single ${cls}"><div class="star">&#9733;</div>
    <div class="centered">${nl2br(p.english)}</div></div>`;
}

const blocks = [];
for (const p of L.pages) {
  if (p.page === "cover") blocks.push(coverPage(p));
  else if (p.page === "dedication") blocks.push(centeredPage(p, "ded"));
  else if (p.page === "end") blocks.push(centeredPage(p, "end"));
  else blocks.push(spread(p));
}

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${esc(L.book_id)} — proof</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,400;9..144,0,500;9..144,1,500&family=Noto+Sans+Ethiopic:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--navy:#222B6D;--gold:#C9A227;--page:#FFFDF7;--sage:#A7B59A;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#EDE6D4;font-family:'Fraunces',Georgia,serif;color:var(--navy);padding:32px;display:flex;flex-direction:column;align-items:center;gap:26px}
.spread{display:flex;align-items:stretch;gap:10px;background:#C9BFA6;padding:10px;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.16);width:100%;max-width:1060px}
.single{position:relative;overflow:hidden;background:var(--page);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.16);width:100%;max-width:560px;aspect-ratio:1/1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9%}
.page{background:var(--page);border-radius:8px;width:50%;aspect-ratio:1/1;position:relative;overflow:hidden}
.spine{width:2px;align-self:stretch;background:repeating-linear-gradient(#d8cba8,#d8cba8 4px,transparent 4px,transparent 10px)}
.L{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9%;text-align:center}
.star{color:var(--gold);font-size:30px;margin-bottom:16px}
.rhyme{font-size:clamp(16px,2.2vw,25px);line-height:1.5;font-weight:500}
.prompt{margin-top:22px;display:inline-block;border:1.5px solid var(--gold);color:#9A7D1E;background:#FBF3DA;font-style:italic;font-size:clamp(13px,1.5vw,18px);padding:7px 18px;border-radius:22px}
.pg{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:#B8AC8B;font-size:13px}
.R img,.cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#b1a583;background:#F1EADB;font-style:italic;font-size:14px}
.band{position:absolute;left:0;right:0;bottom:0;background:rgba(255,253,247,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:9px 0 11px}
.word{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:var(--navy);font-size:clamp(22px,3.4vw,38px);line-height:1}
.translit{color:var(--gold);font-style:italic;font-size:clamp(12px,1.4vw,17px)}
.gloss{color:#8A8676;font-size:clamp(11px,1.2vw,15px)}
.centered{font-size:clamp(18px,2.4vw,26px);font-weight:500;text-align:center;line-height:1.5}
.cover .cover-title{position:absolute;left:0;right:0;top:7%;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.25)}
.ct-en{color:#fff;font-weight:500;font-size:clamp(24px,4vw,44px)}
.ct-am{font-family:'Noto Sans Ethiopic',serif;color:#FBE9B0;font-weight:700;font-size:clamp(18px,2.6vw,28px);margin-top:6px}
@media print{
  body{background:#fff;padding:0;gap:0}
  .spread,.single{box-shadow:none;border-radius:0;background:#fff;max-width:none;page-break-after:always}
  .spread{padding:0;gap:0}
}
</style></head><body>
${blocks.join("\n")}
</body></html>`;

const out = path.resolve(bookDir, "proof.html");
fs.writeFileSync(out, html);
const have = L.pages.filter((p) => p.image && fs.existsSync(path.resolve(bookDir, artDir, p.image))).length;
const need = L.pages.filter((p) => p.image).length;
console.log(`Wrote ${path.relative(process.cwd(), out)}`);
console.log(`Art present: ${have}/${need} pages. Open proof.html in a browser; Print -> Save as PDF for the book.`);
