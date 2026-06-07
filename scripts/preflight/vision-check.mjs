#!/usr/bin/env node
// Kokeba VISION QA — automated pixel-level inspection (the audit, automated).
// Sends each page (plus the locked character/animal references) to a vision model
// with a publication rubric and collects structured defect flags: character/animal
// drift, floating/anatomy, rendering defects (melting/blank/disappearing), unsafe
// proximity, scariness, and text-safe-zone intrusions.
//
// Usage:
//   node scripts/preflight/vision-check.mjs <book-dir> [--only s03,cover] [--json] [--dry-run]
//
// Env: IMAGE_GEN_API_KEY (OpenAI key), VISION_MODEL (default gpt-4o-mini).
// Advisory by default (surfaced to the reviewer); exit 1 if any HIGH-severity defect.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// --- minimal .env loader (same approach as the generator) ---
(function loadDotEnv() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
    const l = raw.trim(); if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("="); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim().replace(/\s+#.*$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
})();

const args = process.argv.slice(2);
const bookDir = args.find((a) => !a.startsWith("--"));
const JSON_OUT = args.includes("--json");
const DRY = args.includes("--dry-run");
const onlyArg = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] ||
  (args.includes("--only") ? args[args.indexOf("--only") + 1] : null);
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;
if (!bookDir) { console.error("Usage: node scripts/preflight/vision-check.mjs <book-dir> [--only ids] [--json] [--dry-run]"); process.exit(2); }

const MODEL = process.env.VISION_MODEL || "gpt-4o-mini";
const KEY = process.env.IMAGE_GEN_API_KEY || process.env.OPENAI_API_KEY;
const manifest = JSON.parse(fs.readFileSync(path.resolve(bookDir, "scenes.json"), "utf8"));
const artDir = path.resolve(bookDir, manifest.art_dir || "art");

const RUBRIC = `You are a meticulous children's picture-book art QA reviewer for ages 0-3, doing a PRE-PUBLICATION inspection.
Inspect the PAGE IMAGE (first image) for real, clearly-visible publication defects. Any REFERENCE images that follow show how the recurring characters/animals MUST look — flag drift from them.
Return STRICT JSON ONLY: {"issues":[{"category":"...","severity":"high|medium|low","note":"short specific description"}]}.
Allowed categories: character_consistency (Eden/Mama off-model vs reference), animal_consistency (animal differs from its reference/other pages), proximity_safety (animal unrealistically close to / looming over the child, or a predator not clearly separated by a barrier/moat), floating_or_anatomy (child floating / feet off ground / broken anatomy), rendering_defect (melting, warped, blank, unfinished, or disappearing fences/gates/ground), scariness (anything scary/aggressive for 0-3, e.g. bared teeth), text_safe_zone (busy content or faces in the bottom ~18% where the word band goes), other.
Only report genuine problems. If the page is clean, return {"issues":[]}. Do not nitpick art style or minor color shifts.`;

function dataUrl(fp) {
  const ext = path.extname(fp).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,${fs.readFileSync(fp).toString("base64")}`;
}

function buildContent(scene) {
  const content = [{ type: "text", text: `${RUBRIC}\n\nThis page is "${scene.id}". Expected: ${scene.vocab ? scene.vocab.en + " page" : scene.id}. The first image is the PAGE.` }];
  const pageFp = path.resolve(artDir, scene.file);
  content.push({ type: "image_url", image_url: { url: dataUrl(pageFp), detail: "high" } });
  // reference images for consistency comparison
  const refs = [];
  for (const rel of Object.values(manifest.refs || {})) refs.push(path.resolve(bookDir, rel));
  for (const f of scene.extra_ref_files || []) refs.push(path.resolve(artDir, f));
  for (const r of refs.slice(0, 4)) if (fs.existsSync(r)) content.push({ type: "image_url", image_url: { url: dataUrl(r), detail: "low" } });
  return content;
}

const SEV = { high: "fail", medium: "warn", low: "warn" };
const flags = [];

let scenes = (manifest.scenes || []).filter((s) => s.file && fs.existsSync(path.resolve(artDir, s.file)));
if (only) scenes = scenes.filter((s) => only.has(s.id));

if (DRY) {
  for (const s of scenes) console.log(`— ${s.id}: would send page + ${(Object.keys(manifest.refs||{}).length)+ (s.extra_ref_files||[]).length} reference image(s) to ${MODEL}`);
  console.log(`\nDRY-RUN: ${scenes.length} pages, model ${MODEL}. Set IMAGE_GEN_API_KEY and drop --dry-run to run.`);
  process.exit(0);
}
if (!KEY) { console.error("IMAGE_GEN_API_KEY (or OPENAI_API_KEY) not set."); process.exit(2); }

const { default: OpenAI } = await import("openai");
const client = new OpenAI({ apiKey: KEY });

for (const scene of scenes) {
  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: buildContent(scene) }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });
    const parsed = JSON.parse(res.choices[0].message.content || "{}");
    for (const iss of parsed.issues || []) flags.push({ level: SEV[iss.severity] || "warn", page: scene.id, check: `vision:${iss.category}`, msg: iss.note });
  } catch (e) {
    flags.push({ level: "warn", page: scene.id, check: "vision:error", msg: e.message });
  }
  if (!JSON_OUT) process.stdout.write(".");
}

const fail = flags.filter((f) => f.level === "fail");
const warn = flags.filter((f) => f.level === "warn");
if (JSON_OUT) {
  console.log(JSON.stringify({ ok: fail.length === 0, model: MODEL, counts: { fail: fail.length, warn: warn.length, pass: scenes.length - new Set(flags.map((f) => f.page)).size }, flags }, null, 2));
} else {
  console.log(`\n\nKokeba vision QA (${MODEL}) — ${manifest.book_id || bookDir}`);
  console.log(`  ${fail.length} high · ${warn.length} medium/low across ${scenes.length} pages\n`);
  for (const f of [...fail, ...warn]) console.log(`  ${f.level === "fail" ? "✗" : "⚠"} [${f.page}] ${f.check}: ${f.msg}`);
  if (!flags.length) console.log("  ✓ no visual defects flagged");
}
process.exit(fail.length ? 1 : 0);
