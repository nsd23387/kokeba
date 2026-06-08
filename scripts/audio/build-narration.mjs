#!/usr/bin/env node
// Kokeba narration — read-aloud audio for a book (audiobook / YouTube / ACX asset).
// Narrates each page's English story + the heritage word (using its transliteration so an
// English TTS voice approximates the pronunciation). Produces per-page mp3s and, if ffmpeg
// is present, a combined audiobook.mp3. Provider: OpenAI TTS (swappable).
//
// Usage: node scripts/audio/build-narration.mjs <book-dir> [--dry-run] [--force]
// Env: IMAGE_GEN_API_KEY (OpenAI), TTS_MODEL (default tts-1), TTS_VOICE (default shimmer)

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

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

const bookDir = process.argv[2];
const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
if (!bookDir) { console.error("Usage: node scripts/audio/build-narration.mjs <book-dir> [--dry-run]"); process.exit(2); }
const abs = path.resolve(bookDir);
const L = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const heritage = { am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba", so: "Somali" }[(L.languages || []).find((x) => x !== "en")] || "the heritage language";
const MODEL = process.env.TTS_MODEL || "tts-1";
const VOICE = process.env.TTS_VOICE || "shimmer";
const KEY = process.env.IMAGE_GEN_API_KEY || process.env.OPENAI_API_KEY;
const audioDir = path.join(abs, "audio");

// narration text per page
function lineFor(p) {
  if (p.page === "cover") return `${(L.pages.find((x) => x.page === "cover") || {}).title_en || L.book_id}. A Kokeba book.`;
  let t = (p.english || "").replace(/\n/g, " ").trim();
  if (p.interaction) t += ` ${p.interaction}`;
  if (p.vocab) t += ` In ${heritage}, ${p.vocab.en} is ${p.vocab.translit}.`;
  return t;
}
const pages = L.pages.filter((p) => p.english || p.vocab || p.page === "cover")
  .map((p) => ({ id: p.page, text: lineFor(p), file: `p${String(p.page).replace(/\D/g, "").padStart(2, "0") || p.page}.mp3` }));

if (DRY) {
  pages.forEach((p) => console.log(`— ${p.id}: "${p.text.slice(0, 90)}${p.text.length > 90 ? "…" : ""}"`));
  console.log(`\nDRY-RUN: ${pages.length} narration clips, voice ${VOICE}, model ${MODEL}. Set IMAGE_GEN_API_KEY and drop --dry-run.`);
  process.exit(0);
}
if (!KEY) { console.error("IMAGE_GEN_API_KEY (or OPENAI_API_KEY) not set."); process.exit(2); }

fs.mkdirSync(audioDir, { recursive: true });
const { default: OpenAI } = await import("openai");
const client = new OpenAI({ apiKey: KEY });

const made = [];
for (const p of pages) {
  const out = path.join(audioDir, p.file);
  if (fs.existsSync(out) && !FORCE) { made.push(out); continue; }
  process.stdout.write(`🎙  ${p.id} … `);
  const res = await client.audio.speech.create({ model: MODEL, voice: VOICE, input: p.text, response_format: "mp3" });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log("ok");
  made.push(out);
}

// combine into audiobook.mp3 if ffmpeg is available
try {
  const listFile = path.join(audioDir, "_concat.txt");
  fs.writeFileSync(listFile, made.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
  execFileSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", path.join(abs, "audiobook.mp3")], { stdio: "ignore" });
  fs.rmSync(listFile, { force: true });
  console.log(`\n✓ ${made.length} clips + audiobook.mp3`);
} catch {
  console.log(`\n✓ ${made.length} clips in audio/ (install ffmpeg to auto-combine into audiobook.mp3)`);
}
