#!/usr/bin/env node
// Kokeba market validation — opportunity score for a title BEFORE you invest in art.
// Scores demand vs. competition for a heritage-language children's book and returns a
// go/no-go verdict + reasons. Deterministic heuristic by default; plug real Amazon /
// keyword search-volume data into `liveSignals()` (e.g. DataForSEO) when you have a key.
//
// Usage: node scripts/market/validate-topic.mjs <book-dir> [--json]
// Writes <book-dir>/market.json.

import fs from "node:fs";
import path from "node:path";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
if (!bookDir) { console.error("Usage: node scripts/market/validate-topic.mjs <book-dir> [--json]"); process.exit(2); }
const abs = path.resolve(bookDir);
const L = JSON.parse(fs.readFileSync(path.join(abs, "layout.json"), "utf8"));
const listing = fs.existsSync(path.join(abs, "listing-metadata.json")) ? JSON.parse(fs.readFileSync(path.join(abs, "listing-metadata.json"), "utf8")) : null;

const langCode = (L.languages || ["en", "am"]).find((x) => x !== "en") || "am";
const SPEAKERS_M = { am: 35, sw: 80, ha: 80, yo: 47, so: 22, ti: 9, om: 37, ti_gr: 9, ar: 400 }; // approx native speakers (millions)
const DIASPORA = { am: 3, sw: 2, so: 3, ti: 1, om: 1, ha: 1, yo: 2, ar: 5 };                    // approx diaspora strength (millions, rough)
const LANG_NAME = { am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba", so: "Somali", ti: "Tigrinya", om: "Oromo", ar: "Arabic" };
const heritage = LANG_NAME[langCode] || "heritage language";
const speakers = SPEAKERS_M[langCode] || 10;
const diaspora = DIASPORA[langCode] || 1;

// --- signals (heuristic; replace with liveSignals() for real data) ---
function liveSignals() { return null; } // TODO: DataForSEO / Amazon search-volume + competing-title count
const live = liveSignals();

// Demand: heritage-language + diaspora families wanting first books = real, durable demand.
const demand = Math.min(100, Math.round(28 + speakers * 0.5 + diaspora * 6));
// Competition: heritage-language children's books are a thin niche on KDP (few quality titles) → low competition = high opportunity.
const competitionLevel = "low";
const competitionPenalty = 10; // low competition → small penalty
// Trend: multicultural / heritage-language / bilingual kids books are a rising category.
const trend = 12;

let score = Math.max(0, Math.min(100, Math.round(demand * 0.55 + (100 - competitionPenalty) * 0.3 + trend)));
if (live) score = live.score; // override with real data when available

const verdict = score >= 70 ? "STRONG — proceed" : score >= 50 ? "MODERATE — proceed with focused keywords" : "WEAK — reconsider topic/keywords";
const reasons = [
  `${heritage} has ~${speakers}M speakers and a ~${diaspora}M diaspora seeking heritage-language first books.`,
  `Heritage-language children's books are a thin, under-served niche on KDP — ${competitionLevel} competition.`,
  `Multicultural / bilingual early-reader category is trending upward.`,
  listing ? `Primary keyword: "${listing.seo?.primary_keyword}"; ${(listing.kdp_keyword_slots || []).length} validated backend slots ready.` : `Run the listing generator for validated keywords.`,
];

const market = {
  book_id: L.book_id, heritage, age_range: L.age_range || "0-3",
  opportunity_score: score, verdict,
  signals: { demand, competition: competitionLevel, trend: "rising", data_source: live ? "live" : "heuristic" },
  reasons,
  recommended_keywords: listing?.kdp_keyword_slots || [],
  diaspora_markets: listing?.markets?.diaspora_targets || [],
  note: "Heuristic estimate. Plug a search-volume/competition API into liveSignals() for real numbers.",
};
fs.writeFileSync(path.join(abs, "market.json"), JSON.stringify(market, null, 2));

if (JSON_OUT) console.log(JSON.stringify(market));
else {
  console.log(`\nKokeba market validation — ${L.book_id}`);
  console.log(`  Opportunity: ${score}/100 — ${verdict}`);
  console.log(`  demand ${demand} · competition ${competitionLevel} · trend rising (${market.signals.data_source})`);
  reasons.forEach((r) => console.log(`  • ${r}`));
  console.log(`  wrote market.json`);
}
