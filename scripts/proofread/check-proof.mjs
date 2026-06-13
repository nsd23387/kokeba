#!/usr/bin/env node
// Kokeba Proof Reader — automated QA that owns "did the words actually make it into what we ship?"
// Two layers of checks:
//
//  (1) LAYOUT (pre-export, geometric): renders proof-print.html headlessly and measures EVERY
//      text element against KDP's trim/safe margins — catches glosses/words/titles clipped at the
//      cut line, plus duplicate front-matter text.
//
//  (2) DELIVERABLES (post-export, the shipped files): inspects the actual book.epub and the
//      derived cover image — catches the class of bug where the design has text but the OUTPUT
//      doesn't:
//        • EPUB rendered image-only (story text/word dropped, surviving only in alt) — detected by
//          page-count parity vs interior.pdf and by raw scene-art (sNN) being embedded directly.
//        • EPUB pages missing alt text (accessibility).
//        • Cover (or EPUB embedded cover) built from the bare illustration with NO title text —
//          detected by OCR'ing the image for the book's title.
//
// Hard-gates: exit 1 (FAIL) means "do not ship — fix it first."
//
// Usage: node scripts/proofread/check-proof.mjs <book-dir> [--json] [--safe 0.25]
//          [--layout-only | --deliverables-only]   (default: run both)
// Needs: layout → proof-print.html + puppeteer;  deliverables → unzip, pdfinfo, tesseract (OCR), sharp.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
const LAYOUT_ONLY = process.argv.includes("--layout-only");
const DELIV_ONLY = process.argv.includes("--deliverables-only");
const safeArg = (() => { const i = process.argv.indexOf("--safe"); return i >= 0 ? parseFloat(process.argv[i + 1]) : 0.25; })();
if (!bookDir) { console.error("Usage: node scripts/proofread/check-proof.mjs <book-dir> [--json] [--safe 0.25] [--layout-only|--deliverables-only]"); process.exit(2); }

const abs = path.resolve(bookDir);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const L = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const tm = String(L.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)/);
const trimW = tm ? +tm[1] : 8.5, trimH = tm ? +tm[2] : 8.5;
const bleed = L.bleed_in ?? 0.125;
const safeFromEdgeIn = bleed + safeArg;
const coverP = (L.pages || []).find((p) => p.page === "cover") || {};
const have = (bin) => { try { execFileSync("command", ["-v", bin], { shell: "/bin/bash", stdio: "ignore" }); return true; } catch { return false; } };

const flags = [];

// ---------------------------------------------------------------------------
// (1) LAYOUT — trim/safe-margin clipping + duplicate front-matter text
// ---------------------------------------------------------------------------
async function layoutChecks() {
  const proofPath = path.join(abs, "proof-print.html");
  if (!fs.existsSync(proofPath)) {
    try { execFileSync("node", [path.join(REPO, "scripts/layout/build-book.mjs"), abs, "--single"], { cwd: REPO, stdio: "ignore" }); } catch {}
  }
  if (!fs.existsSync(proofPath)) { flags.push({ layer: "layout", level: "warn", issue: "no proof-print.html to check (run: npm run render -- <dir> --single)" }); return 0; }

  let puppeteer;
  try { ({ default: puppeteer } = await import("puppeteer")); }
  catch { flags.push({ layer: "layout", level: "warn", issue: "puppeteer not installed — layout margin check skipped" }); return 0; }

  let browser;
  try { browser = await puppeteer.launch({ headless: "new" }); }
  catch (e) { flags.push({ layer: "layout", level: "warn", issue: `could not launch headless Chrome for the layout check (${(e.message || "").split("\n")[0]}) — run \`npx puppeteer browsers install chrome\`. Margin check skipped.` }); return 0; }
  const page = await browser.newPage();
  await page.goto("file://" + proofPath, { waitUntil: "networkidle0", timeout: 60000 });
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}

  const TEXT_SEL = ".rhyme,.prompt,.word,.translit,.gloss,.fidel-big,.fidel-sound,.fidel-for,.centered,.r-title,.r-sub,.r-en,.r-tr,.r-am,.fm-title,.fm-title-am,.fm-by,.fm-imprint,.about,.fm-contact,.cp-box";
  const res = await page.evaluate((sel, safeIn, bleedIn) => {
    const DPI = 96, safePx = safeIn * DPI, trimPx = bleedIn * DPI;
    const sheets = [...document.querySelectorAll(".sheet")]; const out = [];
    sheets.forEach((sheet, i) => {
      const sr = sheet.getBoundingClientRect();
      [...sheet.querySelectorAll(sel)].forEach((el) => {
        const t = (el.textContent || "").trim(); if (!t) return;
        const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return;
        const ins = { left: r.left - sr.left, right: sr.right - r.right, top: r.top - sr.top, bottom: sr.bottom - r.bottom };
        const minInset = Math.min(ins.left, ins.right, ins.top, ins.bottom);
        if (minInset < safePx) {
          const edges = Object.entries(ins).filter(([, v]) => v < safePx).map(([k, v]) => `${k} ${(v / DPI).toFixed(3)}in`);
          out.push({ page: i + 1, cls: [...el.classList].join("."), text: t.slice(0, 40), level: "fail", past_trim: minInset < trimPx, edges, min_inset_in: +(minInset / DPI).toFixed(3) });
        }
      });
      const seen = {};
      [...sheet.querySelectorAll(sel)].forEach((el) => {
        const key = (el.textContent || "").trim().replace(/^by\s+/i, ""); if (!key) return;
        if (seen[key]) out.push({ page: i + 1, level: "warn", text: key.slice(0, 40), issue: "duplicate text on page" });
        seen[key] = 1;
      });
    });
    return { sheets: sheets.length, flags: out };
  }, TEXT_SEL, safeFromEdgeIn, bleed);
  await browser.close();
  res.flags.forEach((f) => flags.push({ layer: "layout", ...f }));
  return res.sheets;
}

// ---------------------------------------------------------------------------
// (2) DELIVERABLES — the shipped EPUB + cover actually carry the text
// ---------------------------------------------------------------------------
function pdfPageCount(p) { try { return +(execFileSync("pdfinfo", [p]).toString().match(/Pages:\s+(\d+)/)?.[1] || 0); } catch { return 0; } }

// Which physical edges of a rendered page are a solid WHITE strip (a bleed gap)? Parses a binary
// P6 PPM. White gap = the PDF page's blank paper (255,255,255); the book's own backgrounds are cream
// (#FFFDF7 → blue 247), so a true gap is distinguishable from intended background by the blue channel.
function whiteEdges(buf) {
  let p = 0;
  const tok = () => { while (p < buf.length && buf[p] <= 0x20) p++; const s = p; while (p < buf.length && buf[p] > 0x20) p++; return buf.toString("ascii", s, p); };
  if (tok() !== "P6") return [];
  const W = +tok(), H = +tok(); tok(); p++; // skip maxval + single whitespace
  const base = p;
  const isWhite = (x, y) => { const i = base + (y * W + x) * 3; return buf[i] >= 250 && buf[i + 1] >= 250 && buf[i + 2] >= 252; };
  const fracRow = (y) => { let c = 0, n = 0; for (let x = 0; x < W; x += Math.max(1, (W / 200) | 0)) { n++; if (isWhite(x, y)) c++; } return c / n; };
  const fracCol = (x) => { let c = 0, n = 0; for (let y = 0; y < H; y += Math.max(1, (H / 200) | 0)) { n++; if (isWhite(x, y)) c++; } return c / n; };
  const out = [];
  if (fracRow(1) > 0.9) out.push("top");
  if (fracRow(H - 2) > 0.9) out.push("bottom");
  if (fracCol(1) > 0.9) out.push("left");
  if (fracCol(W - 2) > 0.9) out.push("right");
  return out;
}

// Pixel dimensions straight from the file header — no native image lib (sharp may be unavailable).
function imgDims(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; // PNG
  if (buf[0] === 0xff && buf[1] === 0xd8) { // JPEG: find a SOF marker
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// OCR an image and report which of the title's words are visibly present.
// Cover titles are small relative to the full busy illustration, so OCR'ing the whole image at
// default settings fails. We scan the likely title bands (full + top + bottom), upscale + grayscale
// each via sharp, and union the OCR text. This is what reliably reads a title over artwork.
async function titleWordsFoundIn(imgPath, titleEn) {
  const words = String(titleEn || "").toLowerCase().match(/[a-z]{3,}/g) || [];
  if (!words.length) return { ok: true, ratio: 1, words, found: words, ocr: false };
  if (!have("tesseract")) return { ok: null, ratio: 0, words, found: [], ocr: false };

  let sharp = null;
  try { ({ default: sharp } = await import("sharp")); } catch {}

  const ocrOne = (file, psm) => { try { return execFileSync("tesseract", [file, "stdout", "--psm", String(psm)], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 8 * 1024 * 1024 }).toString().toLowerCase(); } catch { return ""; } };

  let text = "";
  if (sharp) {
    try {
      const meta = await sharp(imgPath).metadata();
      const W = meta.width || 1600, H = meta.height || 1600;
      const targetW = Math.min(2200, Math.round(W * 1.4));
      const bands = [
        { top: 0, height: H },                                  // whole cover
        { top: 0, height: Math.round(H * 0.40) },               // title near top
        { top: Math.round(H * 0.60), height: Math.round(H * 0.40) }, // title near bottom
      ];
      for (let i = 0; i < bands.length; i++) {
        const tmp = path.join(os.tmpdir(), `kkocr-${process.pid}-${Date.now()}-${i}.png`);
        try {
          await sharp(imgPath).extract({ left: 0, top: bands[i].top, width: W, height: bands[i].height })
            .resize({ width: targetW }).grayscale().normalise().toFile(tmp);
          text += " " + ocrOne(tmp, 6) + " " + ocrOne(tmp, 11);
        } catch {}
        finally { fs.rmSync(tmp, { force: true }); }
      }
    } catch { text = ocrOne(imgPath, 11); }
  } else {
    text = ocrOne(imgPath, 11) + " " + ocrOne(imgPath, 6);
  }

  const found = words.filter((w) => text.includes(w));
  return { ok: found.length >= Math.ceil(words.length / 2), ratio: found.length / words.length, words, found, ocr: true };
}

async function deliverableChecks() {
  const titleEn = coverP.title_en || L.book_id;

  // --- interior bleed integrity: pages must include bleed AND fill it (art/background to every edge) ---
  const interiorPdf = path.join(abs, "interior.pdf");
  if (fs.existsSync(interiorPdf) && have("pdfinfo")) {
    const info = execFileSync("pdfinfo", [interiorPdf]).toString();
    const ps = info.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);
    const pdfWin = ps ? +ps[1] / 72 : 0, pdfHin = ps ? +ps[2] / 72 : 0;
    if (pdfWin && (pdfWin < trimW + bleed - 0.01 || pdfHin < trimH + bleed - 0.01)) {
      flags.push({ layer: "deliverable", artifact: "interior.pdf", level: "fail",
        issue: `interior.pdf is ${pdfWin.toFixed(3)}×${pdfHin.toFixed(3)}in but a bled interior needs at least trim+bleed (${(trimW + bleed).toFixed(3)}×${(trimH + bleed).toFixed(3)}in) — no/insufficient bleed.` });
    }
    if (have("pdftoppm")) {
      try {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kkbleed-"));
        execFileSync("pdftoppm", ["-r", "100", interiorPdf, path.join(dir, "pg")], { stdio: "ignore" }); // default output is PPM (P6)
        const gaps = [];
        for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".ppm")).sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]))) {
          const edges = whiteEdges(fs.readFileSync(path.join(dir, f)));
          if (edges.length) gaps.push(`p${+f.match(/\d+/)[0]} (${edges.join("/")})`);
        }
        fs.rmSync(dir, { recursive: true, force: true });
        if (gaps.length) flags.push({ layer: "deliverable", artifact: "interior.pdf", level: "fail",
          issue: `${gaps.length} page(s) have a white strip at a physical edge — art/background doesn't bleed to the trim edge (KDP "insufficient bleed"). The interior must fill the full bleed page (trim + 2×bleed) so full-bleed art reaches every edge. Examples: ${gaps.slice(0, 8).join(", ")}.` });
      } catch {}
    }
  }

  // --- EPUB ---
  const epub = path.join(abs, "book.epub");
  if (!fs.existsSync(epub)) {
    flags.push({ layer: "deliverable", artifact: "book.epub", level: "warn", issue: "no book.epub yet (skipped — run after export)" });
  } else if (!have("unzip")) {
    flags.push({ layer: "deliverable", artifact: "book.epub", level: "warn", issue: "unzip unavailable — EPUB not inspected" });
  } else {
    const list = execFileSync("unzip", ["-l", epub]).toString();
    const names = list.split("\n").map((l) => (l.match(/\s(\S+)\s*$/) || [])[1] || "").filter(Boolean);
    const xhtml = names.filter((n) => /\.xhtml$/i.test(n) && !/nav\.xhtml$/i.test(n));
    const imgs = names.filter((n) => /\.(png|jpe?g)$/i.test(n));
    const pageCount = xhtml.length;
    const interiorPages = pdfPageCount(path.join(abs, "interior.pdf"));

    // page-count parity: the eBook must not have fewer pages than the print interior
    if (interiorPages && pageCount < interiorPages) {
      flags.push({ layer: "deliverable", artifact: "book.epub", level: "fail",
        issue: `eBook has ${pageCount} pages but the print interior has ${interiorPages} — the text/word pages were dropped, so the eBook renders image-only. Rebuild with the full-page builder (scripts/ebook/build-epub-fxl.mjs).` });
    }
    // raw scene-art embedded directly => text was never composited into the page
    const rawArt = imgs.filter((n) => /(^|\/)s\d{2}\.(png|jpe?g)$/i.test(n));
    if (rawArt.length) {
      flags.push({ layer: "deliverable", artifact: "book.epub", level: "fail",
        issue: `eBook embeds the raw illustrations (${rawArt.slice(0, 3).join(", ")}…) — the laid-out story text and heritage word are NOT rendered into the page images (image-only). Use the full-page builder.` });
    }
    // page resolution — a low-DPI render looks soft/pixelated in the Kindle previewer.
    try {
      const sample = imgs.find((n) => /(^|\/)pg-?\d+\.(jpe?g|png)$/i.test(n)) || imgs.find((n) => !/cover/i.test(n));
      if (sample) {
        const buf = execFileSync("unzip", ["-p", epub, sample], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
        const d = imgDims(buf);
        const effDpi = d ? Math.round(d.w / trimW) : 0;
        if (effDpi && effDpi < 250) flags.push({ layer: "deliverable", artifact: "book.epub", level: "warn",
          issue: `eBook pages render at ~${effDpi} DPI (${d.w}px on a ${trimW}in trim) — looks soft in the Kindle previewer. Rebuild at higher resolution: \`npm run ebook -- <dir> --dpi 300\`.` });
      }
    } catch {}

    // alt text present on every page (accessibility)
    let missingAlt = 0;
    for (const x of xhtml) { try { const html = execFileSync("unzip", ["-p", epub, "OEBPS/" + x], { stdio: ["ignore", "pipe", "ignore"] }).toString(); if (!/alt="[^"]+"/.test(html)) missingAlt++; } catch {} }
    if (missingAlt) flags.push({ layer: "deliverable", artifact: "book.epub", level: "warn", issue: `${missingAlt} eBook page(s) have empty/missing alt text (accessibility).` });

    // embedded cover page should carry the title (OCR)
    const coverEntry = names.find((n) => /images\/cover\.(jpe?g|png)$/i.test(n));
    if (coverEntry) {
      const tmp = path.join(os.tmpdir(), "kkproof-" + Date.now() + path.extname(coverEntry));
      try { fs.writeFileSync(tmp, execFileSync("unzip", ["-p", epub, coverEntry], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 * 1024 * 1024 })); const r = await titleWordsFoundIn(tmp, titleEn); if (r.ocr && r.ok === false) flags.push({ layer: "deliverable", artifact: "book.epub:cover", level: "warn", issue: `the eBook's embedded cover page does not show the title "${titleEn}" (found ${r.found.length}/${r.words.length} title words) — it may be the bare illustration.` }); fs.rmSync(tmp, { force: true }); } catch {}
    }
  }

  // --- derived cover image (Kindle/marketing cover) ---
  const covers = fs.readdirSync(abs).filter((f) => /(kindle-cover|cover)\.(jpe?g|png|tiff?)$/i.test(f) && !/^cover\.pdf$/i.test(f));
  for (const cov of covers) {
    const r = await titleWordsFoundIn(path.join(abs, cov), coverP.title_en || L.book_id);
    if (r.ok === false && r.ocr) {
      flags.push({ layer: "deliverable", artifact: cov, level: "fail",
        issue: `cover image does not contain the title "${coverP.title_en || L.book_id}" (OCR found ${r.found.length}/${r.words.length} title words) — it was likely built from the bare illustration (art/cover.png) instead of the composed cover (cover.pdf front).` });
    } else if (r.ok === null) {
      flags.push({ layer: "deliverable", artifact: cov, level: "warn", issue: "could not OCR cover to verify the title text (tesseract unavailable)." });
    }
    // cover resolution — KDP wants a crisp cover; below ~1600px shortest side looks soft.
    try {
      const d = imgDims(fs.readFileSync(path.join(abs, cov)));
      if (d) { const minSide = Math.min(d.w, d.h);
        if (minSide < 1600) flags.push({ layer: "deliverable", artifact: cov, level: "warn",
          issue: `cover is ${d.w}×${d.h}px (${minSide}px shortest side) — below KDP's quality target (~1600px+). Rebuild the cover at higher resolution.` }); }
    } catch {}
  }
}

// ---------------------------------------------------------------------------
let sheets = 0;
if (!DELIV_ONLY) sheets = await layoutChecks();
if (!LAYOUT_ONLY) await deliverableChecks();

const fail = flags.filter((f) => f.level === "fail").length;
const warn = flags.filter((f) => f.level === "warn").length;
const report = {
  book_id: L.book_id, trim: `${trimW}x${trimH}in`, bleed, safe_from_edge_in: +safeFromEdgeIn.toFixed(3),
  mode: DELIV_ONLY ? "deliverables" : LAYOUT_ONLY ? "layout" : "both",
  pages: sheets, counts: { fail, warn, pass: Math.max(0, sheets - fail) }, ok: fail === 0, flags,
};
fs.writeFileSync(path.join(abs, "proof-report.json"), JSON.stringify(report, null, 2));

if (JSON_OUT) console.log(JSON.stringify(report));
else {
  console.log(`\nKokeba Proof Reader — ${L.book_id}  (${report.mode})`);
  console.log(`  ${fail} fail · ${warn} warn`);
  flags.forEach((f) => {
    const mark = f.level === "fail" ? "✗" : "⚠";
    if (f.layer === "layout" && !f.issue) console.log(`  ${mark} [layout] p${f.page} "${f.text}" [${f.cls}] too close to edge (${(f.edges || []).join(", ")})`);
    else console.log(`  ${mark} [${f.layer}${f.artifact ? ":" + f.artifact : ""}] ${f.issue}${f.page ? ` (p${f.page})` : ""}`);
  });
  if (!flags.length) console.log("  ✓ layout margins clean and shipped artifacts carry their text");
  console.log("  → wrote proof-report.json");
}
process.exit(fail > 0 ? 1 : 0);
