#!/usr/bin/env node
// Kokeba ebook — fixed-layout EPUB3 (Kindle Kids / picture-book format) with per-page
// ALT-TEXT and accessibility metadata. Each page is a full-bleed image; text travels in
// alt for screen readers. Packaged with the `zip` CLI (EPUB requires mimetype stored first).
//
// Usage: node scripts/ebook/build-epub.mjs <book-dir>
// Output: <book-dir>/book.epub
//
// NOTE: pages here use the page art directly. To bake the laid-out text into each page
// image (visible words), render proof-print.html sheets to images with puppeteer first
// and point IMAGES_DIR at them — same alt-text + packaging path.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const bookDir = process.argv[2];
if (!bookDir) { console.error("Usage: node scripts/ebook/build-epub.mjs <book-dir>"); process.exit(2); }
const abs = path.resolve(bookDir);
const L = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const pub = fs.existsSync(path.join(abs, "publishing.json")) ? JSON.parse(fs.readFileSync(path.join(abs, "publishing.json"), "utf8")) : {};
const artDir = path.join(abs, L.art_dir || "art");
const coverP = L.pages.find((p) => p.page === "cover") || {};
const title = coverP.title_en || L.book_id;
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function pngSize(fp) { try { const b = fs.readFileSync(fp).subarray(0, 24); return b[0] === 0x89 ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : { w: 1024, h: 1024 }; } catch { return { w: 1024, h: 1024 }; } }

// alt text per page (image description + the words, for screen readers)
function altFor(p) {
  if (p.page === "cover") return `Cover. ${title}${coverP.title_am ? " — " + coverP.title_am : ""}. A Kokeba picture book.`;
  if (p.vocab) return `Illustration: a friendly ${p.vocab.en} at the zoo. The word is ${p.vocab.en} — ${p.vocab.am} (${p.vocab.translit}). ${p.english ? "Story: " + p.english.replace(/\n/g, " ") : ""}`.trim();
  if (p.english) return p.english.replace(/\n/g, " ");
  return `Page: ${p.page}`;
}

// build the page list (cover + story scenes that have art). Allow page.alt override.
const pages = L.pages.filter((p) => p.image && fs.existsSync(path.join(artDir, p.image)))
  .map((p, i) => { const sz = pngSize(path.join(artDir, p.image)); return { idx: i, id: p.page, image: p.image, alt: p.alt || altFor(p), w: sz.w, h: sz.h }; });

// --- assemble the EPUB tree ---
const root = path.join(abs, "ebook-build");
fs.rmSync(root, { recursive: true, force: true });
const OEB = path.join(root, "OEBPS"), IMG = path.join(OEB, "images"), CSS = path.join(OEB, "css");
fs.mkdirSync(IMG, { recursive: true }); fs.mkdirSync(CSS, { recursive: true });
fs.mkdirSync(path.join(root, "META-INF"), { recursive: true });

fs.writeFileSync(path.join(root, "mimetype"), "application/epub+zip");
fs.writeFileSync(path.join(root, "META-INF", "container.xml"),
  `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
fs.writeFileSync(path.join(CSS, "fxl.css"), `html,body{margin:0;padding:0}.pg{width:100%;height:100%}img{width:100%;height:100%;object-fit:contain;display:block}`);

for (const p of pages) fs.copyFileSync(path.join(artDir, p.image), path.join(IMG, p.image));

// per-page XHTML
for (const p of pages) {
  fs.writeFileSync(path.join(OEB, `p${String(p.idx).padStart(3, "0")}.xhtml`),
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><meta charset="utf-8"/><meta name="viewport" content="width=${p.w}, height=${p.h}"/><link rel="stylesheet" href="css/fxl.css"/><title>${esc(title)}</title></head><body><div class="pg"><img src="images/${esc(p.image)}" alt="${esc(p.alt)}"/></div></body></html>`);
}

// nav
fs.writeFileSync(path.join(OEB, "nav.xhtml"),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><meta charset="utf-8"/><title>Contents</title></head><body>
<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${pages.map((p) => `<li><a href="p${String(p.idx).padStart(3, "0")}.xhtml">${esc(p.id)}</a></li>`).join("")}</ol></nav>
<nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="cover" href="p000.xhtml">Cover</a></li></ol></nav></body></html>`);

const uid = "urn:uuid:" + randomUUID();
const manifest = [
  `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  `<item id="css" href="css/fxl.css" media-type="text/css"/>`,
  ...pages.map((p) => `<item id="img${p.idx}" href="images/${esc(p.image)}" media-type="image/png"${p.idx === 0 ? ' properties="cover-image"' : ""}/>`),
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
    <meta property="rendition:orientation">portrait</meta>
    <meta property="rendition:spread">none</meta>
    <meta property="schema:accessMode">visual</meta>
    <meta property="schema:accessMode">textual</meta>
    <meta property="schema:accessModeSufficient">textual,visual</meta>
    <meta property="schema:accessibilityFeature">alternativeText</meta>
    <meta property="schema:accessibilityFeature">structuralNavigation</meta>
    <meta property="schema:accessibilityHazard">none</meta>
    <meta property="schema:accessibilitySummary">Fixed-layout picture book; every illustration has descriptive alt text including the heritage-language word and its pronunciation.</meta>
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine>
    ${spine}
  </spine>
</package>`);

// --- package as .epub (mimetype stored first, uncompressed) ---
const out = path.join(abs, "book.epub");
fs.rmSync(out, { force: true });
try {
  execFileSync("zip", ["-X", "-0", out, "mimetype"], { cwd: root });
  execFileSync("zip", ["-X", "-9", "-r", out, "META-INF", "OEBPS"], { cwd: root });
  fs.rmSync(root, { recursive: true, force: true });
  console.log(`Wrote book.epub — fixed-layout EPUB3, ${pages.length} pages, alt-text + accessibility metadata.`);
} catch (e) {
  console.log("Built the EPUB source tree in ebook-build/ but `zip` failed:", e.message);
  console.log("Zip manually:  cd ebook-build && zip -X -0 ../book.epub mimetype && zip -X -9 -r ../book.epub META-INF OEBPS");
}
