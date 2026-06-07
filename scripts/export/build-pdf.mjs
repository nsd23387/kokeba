#!/usr/bin/env node
// Kokeba export — render the book proof to a print-ready PDF (fonts embedded).
// Uses headless Chromium (puppeteer) if available; otherwise prints how to enable it.
//
// Usage:
//   node scripts/export/build-pdf.mjs <book-dir>
// Output: <book-dir>/book.pdf  (or instructions if puppeteer isn't installed).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const bookDir = process.argv[2];
if (!bookDir) { console.error("Usage: node scripts/export/build-pdf.mjs <book-dir>"); process.exit(2); }

const abs = path.resolve(bookDir);
const layout = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const proof = path.join(abs, "proof.html");
if (!fs.existsSync(proof)) {
  console.log("proof.html not found — building it first…");
  execFileSync("node", [path.resolve(path.dirname(new URL(import.meta.url).pathname), "../layout/build-book.mjs"), bookDir], { stdio: "inherit" });
}

// trim "8.5x8.5in" -> {w:"8.5in", h:"8.5in"}
const m = String(layout.trim || "8.5x8.5in").match(/([\d.]+)x([\d.]+)\s*([a-z]+)/i);
const W = m ? `${m[1]}${m[3]}` : "8.5in";
const H = m ? `${m[2]}${m[3]}` : "8.5in";
const bleed = layout.bleed_in ? `${layout.bleed_in}in` : "0in";

let puppeteer;
try { puppeteer = (await import("puppeteer")).default; }
catch {
  console.log("\nHeadless export needs Puppeteer (not installed).");
  console.log("  Install once:  npm i -D puppeteer");
  console.log("  Or, right now: open proof.html in a browser and Print → Save as PDF.");
  console.log("\nproof.html is ready at:", path.relative(process.cwd(), proof));
  process.exit(0);
}

const out = path.join(abs, "book.pdf");
const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.goto("file://" + proof, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready"); // ensure Noto Sans Ethiopic embeds
await page.pdf({ path: out, printBackground: true, width: W, height: H, margin: { top: bleed, bottom: bleed, left: bleed, right: bleed } });
await browser.close();
console.log("Wrote", path.relative(process.cwd(), out), `(${W} x ${H}, bleed ${bleed})`);
