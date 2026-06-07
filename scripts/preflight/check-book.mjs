#!/usr/bin/env node
// Kokeba pre-flight QA — deterministic checks that run BEFORE a human reviews (Gate 1).
// Flags structural / safety / consistency defects from the manifest + assets, so obvious
// problems are caught automatically. It cannot see pixels — it checks the things that
// predict visual defects (missing moats on predators, missing animal refs, missing/blank art).
//
// Usage:
//   node scripts/preflight/check-book.mjs <book-dir>
//   node scripts/preflight/check-book.mjs <book-dir> --json
//
// Exit code: 1 if any FAIL (use to block the compliance gate), else 0.

import fs from "node:fs";
import path from "node:path";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
if (!bookDir) { console.error("Usage: node scripts/preflight/check-book.mjs <book-dir> [--json]"); process.exit(2); }

const scenesPath = path.resolve(bookDir, "scenes.json");
const layoutPath = path.resolve(bookDir, "layout.json");
const manifest = fs.existsSync(scenesPath) ? JSON.parse(fs.readFileSync(scenesPath, "utf8")) : null;
const layout = fs.existsSync(layoutPath) ? JSON.parse(fs.readFileSync(layoutPath, "utf8")) : null;
const artDir = path.resolve(bookDir, (manifest && manifest.art_dir) || "art");

const PREDATORS = ["lion", "leopard", "hippo", "tiger", "bear", "crocodile"];
const MOAT_RE = /(moat|set back|water channel|river of|across (a|the) .*water|behind a .*wall)/i;
const FRIENDLY_RE = /(friendly|gentle|soft|smil|cuddly|kind eyes)/i;
const BARRIER_RE = /(rail|fence|wall|moat|enclosure|barrier|mesh)/i;

const flags = []; // {level:'fail'|'warn'|'pass', page, check, msg}
const add = (level, page, check, msg) => flags.push({ level, page, check, msg });

// PNG width/height from the IHDR header (no deps).
function pngSize(file) {
  try {
    const b = fs.readFileSync(file).subarray(0, 24);
    if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50) return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: fs.statSync(file).size };
  } catch { return null; }
}

if (!manifest) add("fail", "—", "manifest", "scenes.json not found");
else {
  const sb = manifest.shared_block || "";
  add(/TEXT-SAFE ZONE/i.test(sb) ? "pass" : "fail", "—", "shared:text-safe-zone", "text-safe zone rule present");
  add(/ZOO IDENTITY/i.test(sb) ? "pass" : "warn", "—", "shared:zoo-identity", "consistent zoo identity (gate/fence) present");

  // reference sheets referenced by the manifest must exist
  for (const [k, rel] of Object.entries(manifest.refs || {})) {
    const fp = path.resolve(bookDir, rel);
    add(fs.existsSync(fp) ? "pass" : "fail", "—", `ref:${k}`, `locked reference ${rel}`);
  }

  for (const sc of manifest.scenes || []) {
    const p = sc.id;
    if (!sc.prompt || !sc.prompt.trim()) add("fail", p, "prompt", "scene has no prompt");
    // animal pages
    const species = sc.vocab?.en?.toLowerCase();
    const isAnimal = Boolean(sc.vocab);
    if (isAnimal) {
      if (!FRIENDLY_RE.test(sc.prompt || "")) add("warn", p, "friendly-face", `animal "${species}" page should specify a friendly face`);
      if (!BARRIER_RE.test(sc.prompt || "")) add("warn", p, "barrier", `animal page should specify a barrier/enclosure`);
      // predators must be set back behind a moat/wall
      if (PREDATORS.includes(species) && !MOAT_RE.test(sc.prompt || ""))
        add("fail", p, "predator-moat", `predator "${species}" must be set back behind a visible moat/wall`);
    }
    // multi-animal pages (cover / reflection) need animal refs for consistency
    const multi = p === "cover" || /reflection|wave back|animals (big|wave)/i.test(sc.prompt || "");
    if (multi && !(sc.extra_ref_files && sc.extra_ref_files.length))
      add("warn", p, "animal-consistency", "multi-animal page should attach approved animal reference images");
    for (const f of sc.extra_ref_files || []) {
      const fp = path.resolve(artDir, f);
      add(fs.existsSync(fp) ? "pass" : "fail", p, "extra-ref", `animal reference ${f}`);
    }
    // art asset present, square, not blank
    if (sc.file) {
      const fp = path.resolve(artDir, sc.file);
      if (!fs.existsSync(fp)) add("fail", p, "art", `art file ${sc.file} missing`);
      else {
        const sz = pngSize(fp);
        if (sz) {
          if (sz.w !== sz.h) add("warn", p, "art-square", `art ${sc.file} not square (${sz.w}x${sz.h})`);
          if (Math.min(sz.w, sz.h) < 1024) add("warn", p, "art-res", `art ${sc.file} below 1024px (${sz.w}x${sz.h})`);
          if (sz.bytes < 60000) add("warn", p, "art-blank", `art ${sc.file} suspiciously small (${Math.round(sz.bytes / 1024)}KB) — may be blank/failed`);
        }
      }
    }
  }
}

// layout vocab must have fidel + transliteration on animal pages
for (const pg of (layout && layout.pages) || []) {
  if (pg.vocab) {
    if (!pg.vocab.am) add("fail", pg.page, "fidel", "vocab missing fidel (am)");
    if (!pg.vocab.translit) add("warn", pg.page, "translit", "vocab missing transliteration");
  }
}

const fail = flags.filter((f) => f.level === "fail");
const warn = flags.filter((f) => f.level === "warn");
const pass = flags.filter((f) => f.level === "pass");

if (JSON_OUT) {
  console.log(JSON.stringify({ ok: fail.length === 0, counts: { fail: fail.length, warn: warn.length, pass: pass.length }, flags }, null, 2));
} else {
  console.log(`\nKokeba pre-flight QA — ${manifest?.book_id || bookDir}`);
  console.log(`  ${fail.length} fail · ${warn.length} warn · ${pass.length} pass\n`);
  const icon = (l) => (l === "fail" ? "✗" : l === "warn" ? "⚠" : "✓");
  for (const f of [...fail, ...warn]) console.log(`  ${icon(f.level)} [${f.page}] ${f.check}: ${f.msg}`);
  if (!fail.length && !warn.length) console.log("  ✓ all checks passed");
}
process.exit(fail.length ? 1 : 0);
