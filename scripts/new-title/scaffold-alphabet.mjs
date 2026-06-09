#!/usr/bin/env node
// Kokeba alphabet/fidel scaffold — a concept-specific generator for ABC-style books.
// Consumes a per-language alphabet pack (content/packs/alphabet/<lang>.json: letters with
// romanization + optional example word/image) and emits a pipeline-ready book:
// layout.json (one "letter" page per character), scenes.json, publishing.json, manuscript.md.
//
// Country-agnostic: every language supplies its own alphabet pack; this builder is generic.
//
// Usage: node scripts/new-title/scaffold-alphabet.mjs <intake.json> [<content-root>]
// intake.json: { book_id?, title_en, title_am?, country, language, author?, reviewer_name? }

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const intakePath = process.argv[2];
const contentRoot = process.argv[3] || "content";
if (!intakePath) { console.error("Usage: node scripts/new-title/scaffold-alphabet.mjs <intake.json> [content-root]"); process.exit(2); }
const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
const lang = intake.language || "am";
const HERITAGE = { am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba", so: "Somali", ti: "Tigrinya", om: "Oromo" }[lang] || "the heritage language";

// load the alphabet pack
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packPath = path.join(repoRoot, "content", "packs", "alphabet", `${lang}.json`);
if (!fs.existsSync(packPath)) {
  console.error(`No alphabet pack for "${lang}" at content/packs/alphabet/${lang}.json — create one (copy am.json) and have a native reviewer fill it.`);
  process.exit(1);
}
const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
const letters = pack.letters || [];

const country = intake.country || "the country";
const bookId = (intake.book_id || `${country}-0-3-${HERITAGE}-alphabet`).toLowerCase().replace(/[^a-z0-9-]/g, "");
const bookDir = path.resolve(contentRoot, bookId);
fs.mkdirSync(path.join(bookDir, "art"), { recursive: true });

// --- layout.json: cover, intro, one letter page each, end ---
const pages = [
  { page: "cover", image: "cover.png", title_en: intake.title_en, title_am: intake.title_am || "" },
  { page: "intro", image: null, english: `Let's learn the ${HERITAGE} fidel!\nOne letter at a time.` },
];
letters.forEach((L, i) => {
  const nn = String(i + 1).padStart(2, "0");
  pages.push({
    page: `L${nn}`, fidel: L.fidel, sound: L.sound,
    image: L.example ? `L${nn}.png` : null,
    example: L.example || null,
  });
});
pages.push({ page: "end", image: null, english: "Kokeba — A story for every little star." });

fs.writeFileSync(path.join(bookDir, "layout.json"), JSON.stringify({
  book_id: bookId, trim: "8.5x8.5in", trim_shape: "square", bleed_in: 0.125, art_dir: "art",
  age_range: intake.age_range || "2-5", script_font: "Noto Sans Ethiopic", languages: ["en", lang],
  concept: "alphabet", template: { status: "scaffolded", type: "alphabet" }, pages,
}, null, 2));

// --- scenes.json: cover + one illustration per letter that has an example word ---
const shared = `Soft, warm children's storybook illustration — gentle painterly shading, rounded friendly shapes, cozy warm lighting. Ages 0-3: NO text in the image, square composition, soft uncluttered background, ONE clear subject, centered. Setting/objects read as ${country}. FRIENDLY: any creature has a soft gentle smile, warm eyes, never scary. RENDER QUALITY: finish every surface; no melting or blank areas. TEXT-SAFE ZONE: keep the bottom ~18% calm (no key subject) for the word band.`;
const scenes = [
  { id: "cover", file: "cover.png", refs: [], prompt: `Scene: a bright, inviting cover for a ${HERITAGE} alphabet book — a cheerful arrangement of a few fidel letters and friendly objects; warm ${country} palette. Keep the top third clear for the title; no readable text in the art.` },
];
letters.forEach((L, i) => {
  if (!L.example) return;
  const nn = String(i + 1).padStart(2, "0");
  scenes.push({ id: `L${nn}`, file: `L${nn}.png`, refs: [], prompt: `ALPHABET PAGE (${L.fidel} / ${L.sound} → ${L.example.en} / ${L.example.translit}): ${L.image || `a friendly ${L.example.en}`}. Single clear subject, centered, soft background.` });
});
fs.writeFileSync(path.join(bookDir, "scenes.json"), JSON.stringify({
  book_id: bookId, model_hint: "gpt-image", size: "1024x1024", art_dir: "art",
  refs: {}, shared_block: shared, scenes,
}, null, 2));

// --- publishing.json ---
fs.writeFileSync(path.join(bookDir, "publishing.json"), JSON.stringify({
  author: intake.author || "", imprint: "Kokeba", copyright_year: new Date().getFullYear(), copyright_holder: intake.author || "",
  edition: "First edition", isbn: "", rights: "All rights reserved.",
  dedication: "For our little star", about: `Kokeba makes warm, inclusive first books carrying a child's heritage language.`,
  ai_notice: "The illustrations and text in this book were created with the assistance of AI.",
  reviewer_name: intake.reviewer_name || "", language_note: `An introduction to the ${HERITAGE} fidel, with one word per letter.`, contact: "",
}, null, 2));

const withWord = letters.filter((L) => L.example).length;
fs.writeFileSync(path.join(bookDir, "manuscript.md"),
`# ${intake.title_en} — ${intake.title_am || ""}\n**Kokeba · Ages 0–3 · ${country} · ${HERITAGE} fidel**\n\nLayout: LEFT = the fidel letter + sound · RIGHT = an example word + illustration.\n\n${letters.map((L, i) => `- **${L.fidel}** (${L.sound})${L.example ? ` → ${L.example.am} *${L.example.translit}* — ${L.example.en}` : "  _(example word pending native review)_"}`).join("\n")}\n`);

fs.writeFileSync(path.join(bookDir, "art", "README.md"), `# art/\nAlphabet book — generate cover.png + one illustration per letter that has an example word.\n`);

console.log(`Scaffolded alphabet book ${bookId} -> ${path.relative(process.cwd(), bookDir)}`);
console.log(`  ${letters.length} letters · ${withWord} with example words · ${letters.length - withWord} awaiting native-reviewed words.`);
if (pack.requires_native_review) console.log(`  ⚠ ${pack.review_note ? "Native review required: " + pack.review_note.slice(0, 90) + "…" : "Pack flagged for native review."}`);
