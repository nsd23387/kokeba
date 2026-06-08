#!/usr/bin/env node
// Kokeba listing metadata — SEO + GEO optimized.
// SEO  = Amazon/web search (title, 7 backend keywords, categories, search terms).
// GEO  = Generative Engine Optimization (entities, attributes, FAQ, an AI-ready summary
//        so LLM answer/recommendation engines can surface the book accurately).
// + geographic/diaspora market targeting.
//
// Deterministic from the book's facts; set ENHANCE=1 (+ IMAGE_GEN_API_KEY) to have a
// model polish the description/keywords. Writes listing-metadata.json.
//
// Usage: node scripts/metadata/build-listing.mjs <book-dir> [--json]

import fs from "node:fs";
import path from "node:path";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
if (!bookDir) { console.error("Usage: node scripts/metadata/build-listing.mjs <book-dir> [--json]"); process.exit(2); }
const rd = (f) => (fs.existsSync(path.resolve(bookDir, f)) ? JSON.parse(fs.readFileSync(path.resolve(bookDir, f), "utf8")) : null);
const scenes = rd("scenes.json") || { scenes: [] };
const layout = rd("layout.json") || {};
const pub = rd("publishing.json") || {};

// --- derive facts ---
const cover = (layout.pages || []).find((p) => p.page === "cover") || {};
const title = cover.title_en || layout.book_id || "Untitled";
const LANG = { am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba", so: "Somali", ti: "Tigrinya", om: "Oromo", ar: "Arabic" };
const COUNTRY = { ethiopia: "Ethiopia", kenya: "Kenya", nigeria: "Nigeria", ghana: "Ghana", somalia: "Somalia" };
const DIASPORA = { ethiopia: ["United States", "Canada", "United Kingdom", "Germany", "Gulf states", "Israel"], kenya: ["United States", "United Kingdom", "Canada"] };
const id = (scenes.book_id || layout.book_id || "").toLowerCase();
const countryKey = Object.keys(COUNTRY).find((c) => id.includes(c)) || "ethiopia";
const country = COUNTRY[countryKey];
const langCode = (layout.languages || ["en", "am"]).find((l) => l !== "en") || "am";
const heritage = LANG[langCode] || "heritage language";
const child = (id.match(/-([a-z]+)-/) && layout.book_id) ? (title.split(" ")[0]) : "the child";
const animals = (scenes.scenes || []).filter((s) => s.vocab).map((s) => s.vocab.en);
const ageRange = layout.age_range || "0-3";
const gradeRange = "Preschool";

// --- SEO ---
const primary = `${heritage} children's book`;
const keywords = [
  `${heritage} for kids`,
  `bilingual ${heritage} English book`,
  `${country} children's book`,
  `African animals toddler book`,
  `first words ${heritage}`,
  `diverse multicultural board book`,
  `zoo animals book for toddlers`,
].slice(0, 7);
const search_terms = [primary, `teach kids ${heritage}`, `${country} heritage book for toddlers`, `${heritage} alphabet first words`, `bilingual picture book ages ${ageRange}`];
const categories = [
  "Children's Books > Animals",
  "Children's Books > Early Learning > Words",
  "Children's Books > Multicultural / Diversity",
];

// --- description (SEO-natural, GEO-structured) ---
const animalList = animals.slice(0, 6).join(", ");
const description_html =
  `<p><b>${title}</b> is a warm, inclusive board book for ages ${ageRange} that pairs an everyday adventure with first words in ${heritage}.</p>` +
  `<p>Join ${child} on a joyful trip to meet ${animalList} — each page shares one ${heritage} word (in ${heritage === "Amharic" ? "fidel script" : "script"} with a simple pronunciation) to read aloud together. A gentle, repetitive, call-and-response story made for the very youngest readers.</p>` +
  `<ul><li>Bilingual: English story + ${heritage} heritage words</li><li>Ages ${ageRange}, designed for read-aloud</li><li>Celebrates ${country} heritage, inclusive of all families</li></ul>`;

// --- GEO: Generative Engine Optimization ---
const geo = {
  summary_for_ai: `${title} is a bilingual English–${heritage} picture book for children ages ${ageRange}, from the Kokeba imprint. It teaches a few ${heritage} heritage words through a friendly ${animals.length ? "zoo-animal" : ""} story and is aimed at ${country} families and the diaspora who want to share their heritage language with toddlers.`,
  entities: ["Kokeba", title, child, heritage, country, "bilingual children's book", "board book", ...animals.slice(0, 5)],
  attributes: { language: ["English", heritage], age_range: ageRange, format: "board / picture book", themes: ["heritage language", "animals", "first words", "family", "inclusion"], reading_mode: "read-aloud" },
  faq: [
    { q: `What ages is ${title} for?`, a: `It is written for children ages ${ageRange} (preschool / toddler), as a read-aloud.` },
    { q: `Does ${title} teach ${heritage}?`, a: `Yes — each animal page introduces one ${heritage} word with its English meaning and a simple pronunciation.` },
    { q: `Is it bilingual?`, a: `Yes, an English story carries ${heritage} heritage vocabulary on every animal page.` },
    { q: `Who is it for?`, a: `${country} families and the diaspora wanting to share their heritage language, and anyone seeking diverse, inclusive picture books.` },
    { q: `What is the story about?`, a: `A child visits the zoo and meets friendly animals, learning a heritage word for each.` },
  ],
};

// --- geographic / diaspora targeting ---
const markets = {
  primary_marketplaces: ["amazon.com", "amazon.co.uk", "amazon.ca", "amazon.de"],
  diaspora_targets: DIASPORA[countryKey] || ["United States", "United Kingdom", "Canada"],
  localized_search_terms: { [country]: [primary, `${heritage} book for children`], "diaspora": [`teach my child ${heritage}`, `${heritage} book for grandchildren`] },
};

// --- Amazon 7-slot backend keyword optimization (A10 + Rufus semantic, rule-validated) ---
const lc = (s) => String(s).toLowerCase();
const TITLE_WORDS = new Set(lc(`${title} ${heritage} ${country}`).split(/\W+/).filter(Boolean)); // Amazon already indexes title/subtitle words
const PROHIBITED = ["best", "bestselling", "best-selling", "free", "sale", "cheap", "amazon", "kindle", "bestseller", "number one"]; // Amazon-banned: subjective/time-sensitive/platform terms (not generic words like "book")
const TRADEMARKS = ["disney", "pixar", "sesame street", "dr seuss", "dr. seuss", "peppa", "bluey", "marvel", "cocomelon", "paw patrol"];
const ageDigits = ageRange.replace(/[^\d]+/g, " ").trim(); // "2 5"
const cementing = [`multicultural childrens books`, `bilingual books for kids`, `${lc(country)} books for children`, `african picture books`, `diverse early readers`, `heritage language toddlers`];
const longtail = [`${lc(heritage)} book for toddlers`, `${lc(heritage)} for kids ages ${ageDigits}`, `${lc(country)} heritage childrens book`, `bilingual ${lc(heritage)} english`, `learn ${lc(heritage)} for children`, `${lc(country)} animals toddler book`, `read aloud ${lc(heritage)} story`];
function keywordIssues(ph) {
  const out = [];
  if (ph.length > 50) out.push("over 50 chars");
  if (/["']/.test(ph)) out.push("has quotes");
  if (PROHIBITED.some((w) => new RegExp(`\\b${w}\\b`).test(ph))) out.push("prohibited/subjective term");
  if (TRADEMARKS.some((w) => ph.includes(w))) out.push("possible trademark");
  return out;
}
const kwValidation = [];
const usedWords = new Set();
const slots = [];
for (const raw of [...longtail, ...cementing]) {
  if (slots.length >= 7) break;
  const ph = lc(raw).replace(/["']/g, "").replace(/\s+/g, " ").trim();
  const issues = keywordIssues(ph);
  // drop phrases whose words are ALL already in the title (Amazon indexes those for free)
  const words = ph.split(" ").filter((w) => !TITLE_WORDS.has(w));
  if (issues.length) { kwValidation.push({ phrase: ph, status: "rejected", issues }); continue; }
  if (!words.length) { kwValidation.push({ phrase: ph, status: "skipped", issues: ["all words already in title/subtitle"] }); continue; }
  if (slots.includes(ph)) continue;
  slots.push(ph.slice(0, 50));
  words.forEach((w) => usedWords.add(w));
  kwValidation.push({ phrase: ph.slice(0, 50), status: "accepted", issues: [] });
}

const listing = {
  book_id: scenes.book_id || layout.book_id, title,
  subtitle: `A first-words ${heritage} & English story for ages ${ageRange}`,
  author: pub.author || null, imprint: pub.imprint || "Kokeba",
  audience: `Ages ${ageRange} · ${gradeRange}`, age_range: ageRange, grade_range: gradeRange,
  description_html, keywords, search_terms, categories,
  bisac: ["JUVENILE FICTION / Animals", "JUVENILE FICTION / Concepts / Words", "JUVENILE FICTION / People & Places / Africa"],
  seo: { primary_keyword: primary, secondary_keywords: keywords.slice(1), long_tail: search_terms },
  kdp_keyword_slots: slots,            // paste these into KDP's 7 backend keyword fields
  keyword_validation: kwValidation,    // A10/Rufus + Amazon-rule checks
  category_cementing: cementing,       // phrases that unlock extra browse categories
  geo, markets,
};

fs.writeFileSync(path.resolve(bookDir, "listing-metadata.json"), JSON.stringify(listing, null, 2));
if (JSON_OUT) console.log(JSON.stringify(listing));
else {
  console.log(`\nListing metadata — ${listing.book_id}`);
  console.log(`  primary keyword: ${primary}`);
  console.log(`  keywords (7): ${keywords.join(" · ")}`);
  console.log(`  categories: ${categories.join(" | ")}`);
  console.log(`  GEO entities: ${geo.entities.slice(0, 6).join(", ")} …`);
  console.log(`  markets: ${markets.primary_marketplaces.join(", ")} | diaspora: ${markets.diaspora_targets.join(", ")}`);
  console.log(`  wrote listing-metadata.json`);
}
