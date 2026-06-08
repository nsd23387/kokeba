#!/usr/bin/env node
// Kokeba finalize — one shot from approved art to upload-ready files:
//   upscale (300 DPI) -> layout (proof + single-page interior) -> compliance ->
//   export (interior.pdf + cover.pdf) -> validate -> ebook (book.epub).
// Stops if compliance fails (e.g. DPI / KDP spec). Needs: npm i sharp puppeteer.
//
// Usage: node scripts/finalize.mjs [<book-dir>]
//   default: content/examples/ethiopia-0-3/eden-goes-to-the-zoo

import { execFileSync } from "node:child_process";

const book = process.argv[2] || "content/examples/ethiopia-0-3/eden-goes-to-the-zoo";
const run = (label, args, { allowFail = false } = {}) => {
  console.log(`\n=== ${label} ===`);
  try { execFileSync("node", args, { stdio: "inherit" }); }
  catch (e) {
    if (allowFail) { console.error(`\n⚠ ${label} reported issues — review above. Stopping.`); process.exit(1); }
    throw e;
  }
};

run("1/6 Upscale art to 300 DPI", ["scripts/upscale/upscale-art.mjs", book]);
run("2/6 Layout (proof + single-page interior)", ["scripts/layout/build-book.mjs", book, "--single"]);
run("3/6 Compliance (KDP spec — blocks on FAIL)", ["scripts/compliance/check-compliance.mjs", book], { allowFail: true });
run("4/6 Export PDFs (interior + cover + proof)", ["scripts/export/build-pdf.mjs", book]);
run("5/6 Validate PDFs against KDP", ["scripts/validate/validate-pdf.mjs", book], { allowFail: true });
run("6/6 Build fixed-layout ebook", ["scripts/ebook/build-epub.mjs", book]);

console.log(`\n✓ Done. Upload-ready files in ${book}:`);
console.log("   interior.pdf  -> KDP paperback/hardcover interior");
console.log("   cover.pdf     -> KDP cover (back + spine + front)");
console.log("   book.epub     -> Kindle (fixed-layout, accessible)");
console.log("   listing-metadata.json / kdp-metadata.json -> title, keywords, categories, BISAC");
console.log("   provenance.json + provenance.md -> credits / AI provenance");
