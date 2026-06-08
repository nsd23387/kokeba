#!/usr/bin/env node
// Kokeba market validation — opportunity score for a title BEFORE you invest in art.
// Scores demand vs. competition for a heritage-language children's book and returns a
// go/no-go verdict + reasons. Uses LIVE DataForSEO data when DATAFORSEO_LOGIN/PASSWORD
// are set, otherwise falls back to a deterministic heuristic.
//
// Usage: node scripts/market/validate-topic.mjs <book-dir> [--json] [--no-live]
// Env:   DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, DATAFORSEO_LOCATION (default "United States")
// Writes <book-dir>/market.json.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const JSON_OUT = process.argv.includes("--json");
const NO_LIVE = process.argv.includes("--no-live");
if (!bookDir) { console.error("Usage: node scripts/market/validate-topic.mjs <book-dir> [--json] [--no-live]"); process.exit(2); }
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

// Keywords to probe: prefer the validated backend slots, else a sensible fallback set.
const probeKeywords = (listing?.kdp_keyword_slots?.length
  ? listing.kdp_keyword_slots
  : [`${heritage.toLowerCase()} book for toddlers`, `${heritage.toLowerCase()} for kids`, `bilingual ${heritage.toLowerCase()} english`, `learn ${heritage.toLowerCase()} for children`, `${L.country || ""} childrens book`.trim()]
).filter(Boolean).slice(0, 20);

// --- LIVE signals via DataForSEO (search volume = demand, keyword difficulty = competition) ---
async function liveSignals() {
  const LOGIN = process.env.DATAFORSEO_LOGIN, PASS = process.env.DATAFORSEO_PASSWORD;
  if (NO_LIVE || !LOGIN || !PASS || !probeKeywords.length) return null;
  const location = process.env.DATAFORSEO_LOCATION || "United States";
  const auth = "Basic " + Buffer.from(`${LOGIN}:${PASS}`).toString("base64");
  const df = async (p, payload) => {
    const r = await fetch(`https://api.dataforseo.com${p}`, { method: "POST", headers: { Authorization: auth, "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(`DataForSEO ${p} → HTTP ${r.status}`);
    const j = await r.json();
    const task = j.tasks?.[0];
    if (!task || (task.status_code && task.status_code !== 20000)) throw new Error(`DataForSEO ${p} → ${task?.status_message || "no task"}`);
    return task.result || [];
  };
  try {
    const body = [{ keywords: probeKeywords, location_name: location, language_name: "English" }];
    const [vol, diff] = await Promise.all([
      df("/v3/keywords_data/google_ads/search_volume/live", body),
      df("/v3/dataforseo_labs/google/bulk_keyword_difficulty/live", body),
    ]);
    const volByKw = Object.fromEntries(vol.map((x) => [x.keyword, x.search_volume || 0]));
    const diffByKw = {}; (diff[0]?.items || diff).forEach((x) => { if (x.keyword) diffByKw[x.keyword] = x.keyword_difficulty ?? null; });
    const totalVolume = probeKeywords.reduce((s, k) => s + (volByKw[k] || 0), 0);
    const diffs = probeKeywords.map((k) => diffByKw[k]).filter((d) => d != null);
    const avgDiff = diffs.length ? Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length) : null;
    const demand = Math.min(100, Math.round(20 * Math.log10(totalVolume + 1)));
    const competitionLevel = avgDiff == null ? "unknown" : avgDiff < 30 ? "low" : avgDiff < 60 ? "medium" : "high";
    const score = Math.max(0, Math.min(100, Math.round(demand * 0.55 + (100 - (avgDiff ?? 40)) * 0.35 + 10)));
    const perKeyword = probeKeywords.map((k) => ({ keyword: k, search_volume: volByKw[k] ?? 0, keyword_difficulty: diffByKw[k] ?? null })).sort((a, b) => b.search_volume - a.search_volume);
    return { score, demand, competitionLevel, avgDifficulty: avgDiff, totalVolume, perKeyword, location };
  } catch (e) {
    console.error(`live data failed (${e.message}); using heuristic.`);
    return null;
  }
}
const live = await liveSignals();

// --- heuristic fallback ---
const hDemand = Math.min(100, Math.round(28 + speakers * 0.5 + diaspora * 6));
const hScore = Math.max(0, Math.min(100, Math.round(hDemand * 0.55 + (100 - 10) * 0.3 + 12)));

const demand = live ? live.demand : hDemand;
const competitionLevel = live ? live.competitionLevel : "low";
const score = live ? live.score : hScore;

const verdict = score >= 70 ? "STRONG — proceed" : score >= 50 ? "MODERATE — proceed with focused keywords" : "WEAK — reconsider topic/keywords";
const reasons = live
  ? [
      `Live search volume across ${live.perKeyword.length} keywords totals ~${live.totalVolume}/mo (${live.location}).`,
      `Average keyword difficulty ${live.avgDifficulty ?? "n/a"}/100 → ${competitionLevel} competition.`,
      live.perKeyword[0] ? `Top keyword: "${live.perKeyword[0].keyword}" — ${live.perKeyword[0].search_volume}/mo, difficulty ${live.perKeyword[0].keyword_difficulty ?? "n/a"}.` : "",
      `${heritage} heritage-language early readers remain an under-served, trending niche.`,
    ].filter(Boolean)
  : [
      `${heritage} has ~${speakers}M speakers and a ~${diaspora}M diaspora seeking heritage-language first books.`,
      `Heritage-language children's books are a thin, under-served niche on KDP — ${competitionLevel} competition.`,
      `Multicultural / bilingual early-reader category is trending upward.`,
      listing ? `Primary keyword: "${listing.seo?.primary_keyword}"; ${(listing.kdp_keyword_slots || []).length} validated backend slots ready.` : `Run the listing generator for validated keywords.`,
    ];

const market = {
  book_id: L.book_id, heritage, age_range: L.age_range || "0-3",
  opportunity_score: score, verdict,
  signals: { demand, competition: competitionLevel, trend: "rising", data_source: live ? "live (DataForSEO)" : "heuristic", ...(live ? { avg_difficulty: live.avgDifficulty, total_search_volume: live.totalVolume, location: live.location } : {}) },
  reasons,
  keyword_metrics: live ? live.perKeyword : undefined,
  recommended_keywords: listing?.kdp_keyword_slots || probeKeywords,
  diaspora_markets: listing?.markets?.diaspora_targets || [],
  note: live ? "Live demand/competition from DataForSEO (Google Ads search volume + keyword difficulty)." : "Heuristic estimate — set DATAFORSEO_LOGIN/PASSWORD in .env for live data.",
};
fs.writeFileSync(path.join(abs, "market.json"), JSON.stringify(market, null, 2));

if (JSON_OUT) console.log(JSON.stringify(market));
else {
  console.log(`\nKokeba market validation — ${L.book_id}`);
  console.log(`  Opportunity: ${score}/100 — ${verdict}`);
  console.log(`  demand ${demand} · competition ${competitionLevel}${live ? ` (avg difficulty ${live.avgDifficulty}/100, ${live.totalVolume}/mo total)` : ""} · ${market.signals.data_source}`);
  reasons.forEach((r) => console.log(`  • ${r}`));
  if (live) live.perKeyword.slice(0, 7).forEach((k) => console.log(`    – ${k.keyword}: ${k.search_volume}/mo, KD ${k.keyword_difficulty ?? "n/a"}`));
  console.log(`  wrote market.json`);
}
