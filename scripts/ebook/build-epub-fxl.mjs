#!/usr/bin/env node
// Kokeba ebook (FXL, full-page) — builds a fixed-layout EPUB3 where every page is the REAL
// laid-out print page (illustration + English rhyme + heritage word), rendered from the
// final interior.pdf. This fixes the earlier builder that embedded bare art only (text lived
// in alt, so the book looked image-only in readers). Page text is pulled from proof-print.html
// for accurate per-page alt text. The separately-uploaded cover is included as page 0.
//
// Usage: node scripts/ebook/build-epub-fxl.mjs <book-dir> [--dpi 200] [--cover <jpg>]
// Needs: interior.pdf + proof-print.html in <book-dir>, poppler (pdftoppm), zip CLI.
// Output: <book-dir>/book.epub

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const bookDir = process.argv[2];
if (!bookDir) { console.error("Usage: node scripts/ebook/build-epub-fxl.mjs <book-dir> [--dpi 200] [--cover <jpg>]"); process.exit(2); }
const abs = path.resolve(bookDir);
const dpi = (() => { const i = process.argv.indexOf("--dpi"); return i >= 0 ? parseInt(process.argv[i + 1], 10) : 200; })();
const coverArg = (() => { const i = process.argv.indexOf("--cover"); return i >= 0 ? process.argv[i + 1] : null; })();

const L = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const pub = fs.existsSync(path.join(abs, "publishing.json")) ? JSON.parse(fs.readFileSync(path.join(abs, "publishing.json"), "utf8")) : {};
const coverP = (L.pages || []).find((p) => p.page === "cover") || {};
const title = coverP.title_en || L.book_id;
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const interior = path.join(abs, "interior.pdf");
if (!fs.existsSync(interior)) { console.error("No interior.pdf — run the export stage first (build-pdf.mjs)."); process.exit(2); }

// --- geometry: trim + bleed from layout.json (crop the bleed away so the eBook shows the trimmed page) ---
const tm = String(L.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)/);
const trimW = tm ? +tm[1] : 8.5, trimH = tm ? +tm[2] : 8.5;
const bleed = L.bleed_in ?? 0.125;
const cropX = Math.round(bleed * dpi), cropY = Math.round(bleed * dpi);
const cropW = Math.round(trimW * dpi), cropH = Math.round(trimH * dpi);

// --- per-page alt text, parsed from proof-print.html sheets (visible page text) ---
function altTextPerSheet() {
  const f = path.join(abs, "proof-print.html");
  if (!fs.existsSync(f)) return [];
  const html = fs.readFileSync(f, "utf8");
  // split on each sheet open tag; first chunk is the head/preamble
  const parts = html.split(/<div[^>]*class="[^"]*\bsheet\b[^"]*"[^>]*>/i).slice(1);
  return parts.map((chunk) => {
    // take up to the page-number/footer or end; strip tags; collapse whitespace
    const text = chunk
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 480);
  });
}
const alts = altTextPerSheet();

// --- render interior.pdf pages -> trimmed JPEGs (assemble in /tmp to avoid mount unlink EPERM) ---
const root = path.join(os.tmpdir(), "kokeba-epub-" + randomUUID());
fs.rmSync(root, { recursive: true, force: true });
const OEB = path.join(root, "OEBPS"), IMG = path.join(OEB, "images"), CSS = path.join(OEB, "css");
fs.mkdirSync(IMG, { recursive: true }); fs.mkdirSync(CSS, { recursive: true });
fs.mkdirSync(path.join(root, "META-INF"), { recursive: true });

const stem = path.join(IMG, "pg");
execFileSync("pdftoppm", [
  "-jpeg", "-jpegopt", "quality=86,progressive=y",
  "-r", String(dpi),
  "-x", String(cropX), "-y", String(cropY), "-W", String(cropW), "-H", String(cropH),
  interior, stem,
], { stdio: "inherit" });

// collect rendered page files in order
let pageFiles = fs.readdirSync(IMG).filter((f) => /^pg-?\d+\.jpg$/.test(f))
  .sort((a, b) => (parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10)));
if (!pageFiles.length) { console.error("pdftoppm produced no pages"); process.exit(1); }

// --- optional cover as page 0 ---
const coverSrc = coverArg
  ? path.resolve(coverArg)
  : (fs.existsSync(path.join(abs, `${title} - kindle-cover.jpg`)) ? path.join(abs, `${title} - kindle-cover.jpg`) : null);
let coverImg = null;
if (coverSrc && fs.existsSync(coverSrc)) { coverImg = "cover.jpg"; fs.copyFileSync(coverSrc, path.join(IMG, coverImg)); }

// JPEG size reader (SOF0/2 markers) for the FXL viewport
function jpgSize(fp) {
  const b = fs.readFileSync(fp); let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return { w: cropW, h: cropH };
}

// --- page list: [cover?] + interior pages ---
const pages = [];
if (coverImg) pages.push({ image: coverImg, alt: `Cover. ${title}${coverP.title_am ? " — " + coverP.title_am : ""}. A Kokeba picture book.`, cover: true });
pageFiles.forEach((f, i) => pages.push({ image: f, alt: alts[i] || `${title} — page ${i + 1}` }));
pages.forEach((p, i) => { p.idx = i; const s = jpgSize(path.join(IMG, p.image)); p.w = s.w; p.h = s.h; });

fs.writeFileSync(path.join(root, "mimetype"), "application/epub+zip");
fs.writeFileSync(path.join(root, "META-INF", "container.xml"),
  `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
fs.writeFileSync(path.join(CSS, "fxl.css"), `html,body{margin:0;padding:0}.pg{width:100%;height:100%}img{width:100%;height:100%;object-fit:contain;display:block}`);

for (const p of pages) {
  fs.writeFileSync(path.join(OEB, `p${String(p.idx).padStart(3, "0")}.xhtml`),
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><meta charset="utf-8"/><meta name="viewport" content="width=${p.w}, height=${p.h}"/><link rel="stylesheet" href="css/fxl.css"/><title>${esc(title)}</title></head><body><div class="pg"><img src="images/${esc(p.image)}" alt="${esc(p.alt)}"/></div></body></html>`);
}

fs.writeFileSync(path.join(OEB, "nav.xhtml"),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><meta charset="utf-8"/><title>Contents</title></head><body>
<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${pages.map((p) => `<li><a href="p${String(p.idx).padStart(3, "0")}.xhtml">${p.cover ? "Cover" : "Page " + p.idx}</a></li>`).join("")}</ol></nav>
<nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="cover" href="p000.xhtml">Cover</a></li></ol></nav></body></html>`);

const uid = "urn:uuid:" + randomUUID();
const manifest = [
  `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  `<item id="css" href="css/fxl.css" media-type="text/css"/>`,
  ...pages.map((p) => `<item id="img${p.idx}" href="images/${esc(p.image)}" media-type="image/jpeg"${p.cover ? ' properties="cover-image"' : ""}/>`),
  ...pages.map((p) => `<item id="pg${p.idx}" href="p${String(p.idx).padStart(3, "0")}.xhtml" media-type="application/xhtml+xml"/>`),
].join("\n    ");
const spine = pages.map((p) => `<itemref idref="pg${p.idx}"/>`).join("\n    ");

fs.writeFileSync(path.join(OEB, "content.opf"),
`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" prefix="rendition: http://www.idpf.org/vocab/rendition/# schema: http://schema.org/">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:title>${esc(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:language>am</dc:language>
    <dc:creator>${esc(pub.author || pub.imprint || "Kokeba")}</dc:creator>
    <dc:publisher>${esc(pub.imprint || "Kokeba")}</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">auto</meta>
    <meta property="schema:accessMode">visual</meta>
    <meta property="schema:accessMode">textual</meta>
    <meta property="schema:accessModeSufficient">textual,visual</meta>
    <meta property="schema:accessibilityFeature">alternativeText</meta>
    <meta property="schema:accessibilityFeature">structuralNavigation</meta>
    <meta property="schema:accessibilityHazard">none</meta>
    <meta property="schema:accessibilitySummary">Fixed-layout picture book; each page shows the full illustration with the English rhyme and the heritage-language word, and carries descriptive alt text.</meta>
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine>
    ${spine}
  </spine>
</package>`);

const tmpOut = path.join(root, "book.epub");
execFileSync("zip", ["-X", "-0", tmpOut, "mimetype"], { cwd: root });
execFileSync("zip", ["-X", "-9", "-r", tmpOut, "META-INF", "OEBPS"], { cwd: root });
const out = path.join(abs, "book.epub");
fs.copyFileSync(tmpOut, out); // overwrite-in-place (O_TRUNC) avoids unlink EPERM on the mount
const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
fs.rmSync(root, { recursive: true, force: true });
console.log(`Wrote book.epub — FXL, ${pages.length} full pages${coverImg ? " (incl. cover)" : ""} from interior.pdf @ ${dpi}dpi, ${mb}MB.`);
