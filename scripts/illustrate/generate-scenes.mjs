#!/usr/bin/env node
// Kokeba — scene image generator.
// Reads a book's scenes.json, composes each prompt, attaches the locked
// character reference sheets, calls the image provider, and saves PNGs to art/.
//
// Usage:
//   node scripts/illustrate/generate-scenes.mjs <book-dir> [options]
//
// Examples:
//   node scripts/illustrate/generate-scenes.mjs content/examples/ethiopia-0-3/eden-goes-to-the-zoo
//   node scripts/illustrate/generate-scenes.mjs <book-dir> --only s03
//   node scripts/illustrate/generate-scenes.mjs <book-dir> --only cover,s03,s04
//   node scripts/illustrate/generate-scenes.mjs <book-dir> --dry-run     # compose + validate, no API call
//   node scripts/illustrate/generate-scenes.mjs <book-dir> --force       # overwrite existing PNGs
//
// Env (see .env.example): IMAGE_GEN_API_KEY, IMAGE_GEN_MODEL, IMAGE_GEN_QUALITY, IMAGE_GEN_SIZE
// Requires: `pnpm add openai` (or `npm i openai`).

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { composePrompt, resolveRefs } from "./compose-prompt.mjs";

// Minimal .env loader (no dependency). Reads <repo>/.env if present, strips inline
// comments + quotes, and fills any vars not already set in the environment.
function loadDotEnv() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.resolve(here, "../../.env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      val = val.replace(/\s+#.*$/, "").trim(); // strip inline comment on unquoted values
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

// ---------- args ----------
const args = process.argv.slice(2);
const bookDir = args.find((a) => !a.startsWith("--"));
const has = (f) => args.includes(f);
const valOf = (f) => {
  const a = args.find((x) => x.startsWith(`${f}=`));
  if (a) return a.split("=")[1];
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};

if (!bookDir) {
  console.error("Usage: node scripts/illustrate/generate-scenes.mjs <book-dir> [--only id,id] [--dry-run] [--force]");
  process.exit(1);
}

const DRY = has("--dry-run");
const FORCE = has("--force");
const onlyArg = valOf("--only");
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;

// ---------- load manifest ----------
const manifestPath = path.resolve(bookDir, "scenes.json");
if (!fs.existsSync(manifestPath)) {
  console.error(`No scenes.json found at ${manifestPath}`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const size = process.env.IMAGE_GEN_SIZE || manifest.size || "1024x1024";
const artDir = path.resolve(bookDir, manifest.art_dir || "art");
fs.mkdirSync(artDir, { recursive: true });

let scenes = manifest.scenes || [];
if (only) scenes = scenes.filter((s) => only.has(s.id));
if (scenes.length === 0) {
  console.error("No scenes selected.");
  process.exit(1);
}

// ---------- provider (lazy import so --dry-run needs no SDK/key) ----------
async function loadProvider() {
  const mod = await import("./providers/openai.mjs");
  return mod;
}

// ---------- run ----------
console.log(`\nKokeba illustrate — ${manifest.book_id || bookDir}`);
console.log(`  scenes: ${scenes.map((s) => s.id).join(", ")}`);
console.log(`  size:   ${size}   mode: ${DRY ? "DRY-RUN (no API)" : "GENERATE"}\n`);

let provider = null;
if (!DRY) {
  provider = await loadProvider();
  if (!provider.ready()) {
    console.error("⚠  IMAGE_GEN_API_KEY not set — cannot generate. Use --dry-run to validate, or set the key in .env.");
    process.exit(1);
  }
  console.log(`  provider: ${provider.name}\n`);
}

const results = [];
for (const scene of scenes) {
  const outPath = path.join(artDir, scene.file);
  const refPaths = resolveRefs(manifest, scene, bookDir, path);
  const prompt = composePrompt(manifest, scene);

  // validate refs exist
  const missing = refPaths.filter((p) => !fs.existsSync(p));
  if (missing.length) {
    console.error(`✗ ${scene.id}: missing reference image(s):\n   ${missing.join("\n   ")}`);
    results.push({ id: scene.id, ok: false, reason: "missing-ref" });
    continue;
  }

  if (fs.existsSync(outPath) && !FORCE && !DRY) {
    console.log(`• ${scene.id}: exists, skipping (use --force to overwrite) -> ${path.relative(bookDir, outPath)}`);
    results.push({ id: scene.id, ok: true, skipped: true });
    continue;
  }

  if (DRY) {
    console.log(`— ${scene.id}: OK`);
    console.log(`    refs: ${refPaths.map((p) => path.relative(bookDir, p)).join(" + ")}`);
    console.log(`    out:  ${path.relative(bookDir, outPath)}`);
    console.log(`    prompt chars: ${prompt.length}\n`);
    results.push({ id: scene.id, ok: true, dry: true });
    continue;
  }

  try {
    process.stdout.write(`→ ${scene.id}: generating … `);
    const png = await provider.generate({ prompt, refPaths, size });
    fs.writeFileSync(outPath, png);
    console.log(`saved ${path.relative(bookDir, outPath)} (${(png.length / 1024).toFixed(0)} KB)`);
    results.push({ id: scene.id, ok: true });
  } catch (err) {
    console.log("FAILED");
    console.error(`   ${err.message}`);
    results.push({ id: scene.id, ok: false, reason: err.message });
  }
}

// ---------- summary ----------
const ok = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);
console.log(`\nDone: ${ok}/${results.length} ok${failed.length ? `, ${failed.length} failed` : ""}.`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => `${f.id} (${f.reason})`).join(", "));
  process.exit(1);
}
