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
const pubPath = path.resolve(bookDir, "publishing.json");
const pub = fs.existsSync(pubPath) ? JSON.parse(fs.readFileSync(pubPath, "utf8")) : null;

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
    <div class="cover-title"><div class="ct-star">&#9733;</div>
      <div class="ct-en">${esc(p.title_en || "")}</div>
      <div class="ct-rule"></div>
      <div class="ct-am">${esc(p.title_am || "")}</div></div></div>`;
}
function centeredPage(p, cls) {
  return `<div class="single ${cls}"><div class="star">&#9733;</div>
    <div class="centered">${nl2br(p.english)}</div></div>`;
}
// --- front/back matter (from publishing.json) ---
function titlePage() {
  const c = L.pages.find((x) => x.page === "cover") || {};
  return `<div class="single fm"><div class="star">&#9733;</div>
    <div class="fm-title">${esc(c.title_en || L.book_id)}</div>
    ${c.title_am ? `<div class="fm-title-am">${esc(c.title_am)}</div>` : ""}
    ${pub.author ? `<div class="fm-by">by ${esc(pub.author)}</div>` : ""}
    <div class="fm-imprint">${esc(pub.imprint || "")}</div></div>`;
}
function copyrightPage() {
  const holder = pub.copyright_holder || pub.author || pub.imprint || "the publisher";
  const ai = `${esc(pub.ai_notice || "")}${pub.reviewer_name ? ` Reviewed by ${esc(pub.reviewer_name)}.` : ""}`.trim();
  return `<div class="single cp"><div class="cp-box">
    <p>&copy; ${esc(pub.copyright_year || "")} ${esc(holder)}. ${esc(pub.rights || "")}</p>
    ${pub.edition ? `<p>${esc(pub.edition)}</p>` : ""}
    ${pub.isbn ? `<p>ISBN: ${esc(pub.isbn)}</p>` : ""}
    ${pub.imprint ? `<p>${esc(pub.imprint)}</p>` : ""}
    ${ai ? `<p class="ai">${ai}</p>` : ""}
    ${pub.language_note ? `<p>${esc(pub.language_note)}</p>` : ""}
  </div></div>`;
}
function aboutPage() {
  return `<div class="single fm"><div class="star">&#9733;</div>
    <div class="about">${nl2br(pub.about || "")}</div>
    ${pub.contact ? `<div class="fm-contact">${esc(pub.contact)}</div>` : ""}</div>`;
}
// Vocabulary recap page — auto-built from every page that teaches a word.
function recapPage(p) {
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const rows = L.pages.filter((x) => x.vocab).map((x) =>
    `<tr><td class="r-en">${esc(cap(x.vocab.en))}</td><td class="r-tr">${esc(x.vocab.translit)}</td><td class="r-am">${esc(x.vocab.am)}</td></tr>`).join("");
  return `<div class="single recap"><div class="star">&#9733;</div>
    <div class="r-title">${esc(p.title || "Words We Learned Today")}</div>
    <div class="r-sub">${esc(p.subtitle || "Let's say them together!")}</div>
    <table class="r-table"><thead><tr><th>English</th><th>Pronunciation</th><th>Amharic</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Alphabet/fidel letter page — left: big fidel + sound; right: example image + word band.
function letterLeft(p) {
  return `<div class="page L letter-L"><div class="fidel-big">${esc(p.fidel)}</div>
    <div class="fidel-sound">${esc(p.sound || "")}</div>
    ${p.example ? `<div class="fidel-for">is for ${esc(p.example.en)}</div>` : ""}</div>`;
}
function letterRight(p) {
  const band = p.example ? `<div class="band"><div class="word">${esc(p.example.am)}</div>
    <div class="translit">${esc(p.example.translit)}</div><div class="gloss">${esc(p.example.en)}</div></div>` : "";
  return `<div class="page R">${imgTag(p.image, p.example ? p.example.en : p.fidel)}${band}</div>`;
}
function letterSpread(p) { return `<div class="spread">${letterLeft(p)}<div class="spine"></div>${letterRight(p)}</div>`; }

const blocks = [];
for (const p of L.pages) {
  if (p.page === "cover") { blocks.push(coverPage(p)); if (pub) { blocks.push(titlePage()); blocks.push(copyrightPage()); } }
  else if (p.page === "dedication") blocks.push(centeredPage(p, "ded"));
  else if (p.page === "intro") blocks.push(centeredPage(p, "intro"));
  else if (p.fidel) blocks.push(letterSpread(p));
  else if (p.page === "recap") blocks.push(recapPage(p));
  else if (p.page === "end") { if (pub && pub.about) blocks.push(aboutPage()); blocks.push(centeredPage(p, "end")); }
  else blocks.push(spread(p));
}

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${esc((L.pages.find((p) => p.page === "cover") || {}).title_en || L.book_id)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..600;1,400..600&family=Noto+Sans+Ethiopic:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--navy:#222B6D;--gold:#C9A227;--page:#FFFDF7;--sage:#A7B59A;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#EDE6D4;font-family:'Lora',Georgia,serif;color:var(--navy);padding:32px;display:flex;flex-direction:column;align-items:center;gap:26px;font-feature-settings:"liga" 0,"dlig" 0,"clig" 0,"calt" 0}
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
.letter-L{gap:2px}
.fidel-big{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:var(--navy);font-size:clamp(96px,17vw,190px);line-height:1}
.fidel-sound{color:var(--gold);font-style:italic;font-size:clamp(20px,3vw,34px);margin-top:8px}
.fidel-for{color:#8A8676;font-size:clamp(13px,1.6vw,18px);margin-top:14px}
.fm{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:9%;gap:8px}
.fm-title{font-size:clamp(22px,3.2vw,34px);font-weight:500;color:#222B6D}
.fm-title-am{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:#9A7D1E;font-size:clamp(16px,2.2vw,24px)}
.fm-by{color:#6B6F86;font-style:italic;margin-top:6px}.fm-imprint{margin-top:14px;color:#C9A227;font-weight:500}
.about{max-width:80%;line-height:1.6;font-size:clamp(14px,1.7vw,18px)}.fm-contact{margin-top:10px;color:#6B6F86;font-size:13px}
.cp{display:flex;align-items:center;justify-content:center;padding:10%}
.cp-box{font-size:clamp(12px,1.5vw,15px);line-height:1.7;color:#4a4e66;text-align:center;max-width:88%}
.cp-box .ai{margin-top:8px;color:#9A7D1E;font-style:italic}
.recap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7%}
.r-title{font-size:clamp(20px,2.8vw,30px);font-weight:500;color:#222B6D;text-align:center}
.r-sub{color:#9A7D1E;font-style:italic;margin:4px 0 16px;font-size:clamp(13px,1.6vw,18px)}
.r-table{border-collapse:collapse;width:92%}
.r-table th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8A8676;font-weight:600;padding:4px 10px;border-bottom:1.5px solid #E7D7A6;text-align:left}
.r-table td{padding:8px 10px;border-bottom:1px solid #F1EADB;font-size:clamp(14px,1.9vw,20px)}
.r-en{color:#222B6D;font-weight:500}.r-tr{color:#9A7D1E;font-style:italic}
.r-am{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:#222B6D;text-align:right;font-size:clamp(16px,2.3vw,26px)}
.cover .cover-title{position:absolute;left:9%;right:9%;top:6%;text-align:center;background:rgba(255,253,247,.88);border:1px solid rgba(201,162,39,.55);border-radius:16px;padding:14px 18px 16px;box-shadow:0 6px 18px rgba(34,43,109,.12)}
.ct-star{color:var(--gold);font-size:22px;line-height:1;margin-bottom:2px}
.ct-en{color:var(--navy);font-weight:500;font-size:clamp(22px,3.6vw,40px);line-height:1.12}
.ct-rule{height:2px;width:46px;background:var(--gold);margin:9px auto}
.ct-am{font-family:'Noto Sans Ethiopic',serif;color:#9A7D1E;font-weight:700;font-size:clamp(16px,2.4vw,26px)}
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

// --- KDP single-page interior (each physical page on its own sheet, full-bleed) ---
if (process.argv.includes("--single")) {
  const tmm = String(L.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)/);
  const W = tmm ? tmm[1] : "8.5", H = tmm ? tmm[2] : "8.5";
  const sheets = [];
  for (const p of L.pages) {
    if (p.page === "cover") { if (pub) { sheets.push(`<div class="sheet">${titlePage()}</div>`); sheets.push(`<div class="sheet">${copyrightPage()}</div>`); } continue; }
    if (p.page === "dedication") { sheets.push(`<div class="sheet">${centeredPage(p, "ded")}</div>`); continue; }
    if (p.page === "intro") { sheets.push(`<div class="sheet">${centeredPage(p, "intro")}</div>`); continue; }
    if (p.fidel) { sheets.push(`<div class="sheet">${letterLeft(p)}</div>`); sheets.push(`<div class="sheet">${letterRight(p)}</div>`); continue; }
    if (p.page === "recap") { sheets.push(`<div class="sheet">${recapPage(p)}</div>`); continue; }
    if (p.page === "end") { if (pub && pub.about) sheets.push(`<div class="sheet">${aboutPage()}</div>`); sheets.push(`<div class="sheet">${centeredPage(p, "end")}</div>`); continue; }
    sheets.push(`<div class="sheet">${textPage(p)}</div>`);   // left page (story)
    sheets.push(`<div class="sheet">${imagePage(p)}</div>`);  // right page (art + word)
  }
  const printHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..600;1,400..600&family=Noto+Sans+Ethiopic:wght@500;700&display=swap" rel="stylesheet">
<style>
@page{size:${W}in ${H}in;margin:0}
*{box-sizing:border-box;margin:0}body{font-family:'Lora',Georgia,serif;color:#222B6D;font-feature-settings:"liga" 0,"dlig" 0,"clig" 0,"calt" 0}
.sheet{width:${W}in;height:${H}in;page-break-after:always;overflow:hidden;position:relative;background:#FFFDF7}
.sheet .page,.sheet .single{width:100%!important;height:100%!important;aspect-ratio:auto!important;border-radius:0!important;box-shadow:none!important}
.L{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9%;text-align:center}
.star{color:#C9A227;font-size:42px;margin-bottom:18px}
.rhyme{font-size:30px;line-height:1.5;font-weight:500}
.prompt{margin-top:24px;display:inline-block;border:1.5px solid #C9A227;color:#9A7D1E;background:#FBF3DA;font-style:italic;font-size:22px;padding:8px 20px;border-radius:22px}
.R img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.band{position:absolute;left:0;right:0;bottom:0;background:rgba(255,253,247,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:14px 0 18px}
.word{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:#222B6D;font-size:48px;line-height:1}
.translit{color:#C9A227;font-style:italic;font-size:24px}.gloss{color:#8A8676;font-size:20px}
.centered{font-size:30px;font-weight:500;text-align:center;line-height:1.5}.single{display:flex;align-items:center;justify-content:center;padding:9%}
.letter-L{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9%}
.fidel-big{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:#222B6D;font-size:240px;line-height:1}
.fidel-sound{color:#C9A227;font-style:italic;font-size:42px;margin-top:10px}
.fidel-for{color:#8A8676;font-size:22px;margin-top:18px}
.fm{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:9%;gap:10px}
.fm-title{font-size:38px;font-weight:500;color:#222B6D}.fm-title-am{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:#9A7D1E;font-size:26px}
.fm-by{color:#6B6F86;font-style:italic}.fm-imprint{margin-top:16px;color:#C9A227;font-weight:500}
.about{max-width:80%;line-height:1.6;font-size:20px}.fm-contact{margin-top:10px;color:#6B6F86;font-size:15px}
.cp{display:flex;align-items:center;justify-content:center;padding:10%}.cp-box{font-size:16px;line-height:1.8;color:#4a4e66;text-align:center;max-width:88%}.cp-box .ai{margin-top:10px;color:#9A7D1E;font-style:italic}
.recap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7%}
.r-title{font-size:34px;font-weight:500;color:#222B6D;text-align:center}.r-sub{color:#9A7D1E;font-style:italic;margin:6px 0 18px;font-size:20px}
.r-table{border-collapse:collapse;width:88%}.r-table th{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#8A8676;font-weight:600;padding:6px 12px;border-bottom:2px solid #E7D7A6;text-align:left}
.r-table td{padding:11px 14px;border-bottom:1px solid #F1EADB;font-size:24px}.r-en{color:#222B6D;font-weight:500}.r-tr{color:#9A7D1E;font-style:italic}
.r-am{font-family:'Noto Sans Ethiopic',serif;font-weight:700;color:#222B6D;text-align:right;font-size:30px}
.pg{display:none}.ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#b1a583}
</style></head><body>${sheets.join("\n")}</body></html>`;
  fs.writeFileSync(path.resolve(bookDir, "proof-print.html"), printHtml);
  console.log(`Wrote proof-print.html (${sheets.length} single interior pages, ${W}x${H}in)`);
}

const have = L.pages.filter((p) => p.image && fs.existsSync(path.resolve(bookDir, artDir, p.image))).length;
const need = L.pages.filter((p) => p.image).length;
console.log(`Wrote ${path.relative(process.cwd(), out)}`);
console.log(`Art present: ${have}/${need} pages. Open proof.html in a browser; Print -> Save as PDF for the book.`);
