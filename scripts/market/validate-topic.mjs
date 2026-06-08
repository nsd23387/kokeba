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
import { amazonResultsCount } from "../lib/dataforseo.mjs";

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

// Demand-probe keywords: broaden beyond the ultra-specific backend slots (which bucket to
// zero) with shopper-style HEAD terms — this is what people actually type into Amazon search.
const h = heritage.toLowerCase();
const co = (L.country || "").toLowerCase();
const headTerms = [h, `${h} book`, `${h} books for kids`, `${h} childrens book`, `${h} for kids`, `${h} alphabet`, `learn ${h}`, `bilingual ${h}`, co ? `${co} childrens book` : "", "bilingual books for kids", "bilingual books for toddlers"].filter(Boolean);
const demandKeywords = [...new Set([...headTerms, ...probeKeywords].map((k) => k.toLowerCase()))].slice(0, 25);

// --- LIVE signals via DataForSEO AMAZON search volume (the marketplace that matters for KDP) ---
async function liveSignals() {
  const LOGIN = process.env.DATAFORSEO_LOGIN, PASS = process.env.DATAFORSEO_PASSWORD;
  if (NO_LIVE || !LOGIN || !PASS || !demandKeywords.length) return null;
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
    const result = await df("/v3/dataforseo_labs/amazon/bulk_search_volume/live", [{ keywords: demandKeywords, location_name: location, language_name: "English" }]);
    const items = result?.[0]?.items || [];
    const volByKw = Object.fromEntries(items.map((x) => [x.keyword, x.search_volume || 0]));
    const perKeyword = demandKeywords.map((k) => ({ keyword: k, search_volume: volByKw[k] ?? 0 })).sort((a, b) => b.search_volume - a.search_volume);
    const totalVolume = perKeyword.reduce((s, k) => s + k.search_volume, 0);
    const withVolume = perKeyword.filter((k) => k.search_volume > 0).length;
    const demand = Math.min(100, Math.round(18 * Math.log10(totalVolume + 1)));
    // Competition (optional — costs extra SERP credits): count competing Books-department
    // products on Amazon for the top keywords by volume. Enable with COMPETITION=1 or --competition.
    // Without it, hold competition at "low" (validated by manual SERP check — mostly word-lists).
    let competitionLevel = "low", competitionPenalty = 15, competingAvg = null;
    let competitionBasis = "heuristic (thin heritage-language KDP niche)";
    if (process.env.COMPETITION === "1" || process.argv.includes("--competition")) {
      try {
        const top = perKeyword.filter((k) => k.search_volume > 0).slice(0, 3);
        const counts = [];
        for (const k of top) {
          const c = await amazonResultsCount(k.keyword, { location, department: "Books" });
          if (c != null) { counts.push(c); k.competing_products = c; }
        }
        if (counts.length) {
          competingAvg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
          competitionLevel = competingAvg < 1000 ? "low" : competingAvg < 5000 ? "medium" : "high";
          competitionPenalty = competingAvg < 1000 ? 15 : competingAvg < 5000 ? 35 : 55;
          competitionBasis = `live Amazon Books SERP — avg ${competingAvg} competing products across top ${counts.length} keyword(s)`;
        }
      } catch (e) { console.error(`competition lookup failed (${e.message}); using heuristic competition.`); }
    }
    const score = Math.max(0, Math.min(100, Math.round(demand * 0.6 + (100 - competitionPenalty) * 0.3 + 10)));
    return { score, demand, competitionLevel, competingAvg, competitionBasis, avgDifficulty: null, totalVolume, withVolume, marketplace: "Amazon", location, perKeyword };
  } catch (e) {
    const cause = e.cause ? ` [cause: ${e.cause.code || e.cause.message || e.cause}]` : "";
    console.error(`live data failed (${e.message})${cause}; using heuristic.`);
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
      `Live Amazon search volume: ~${live.totalVolume}/mo across ${live.withVolume}/${live.perKeyword.length} probed keywords (${live.location}).`,
      live.perKeyword[0] ? `Top Amazon term: "${live.perKeyword[0].keyword}" — ${live.perKeyword[0].search_volume}/mo.` : "",
      `Competition: ${competitionLevel}${live.competingAvg != null ? ` (~${live.competingAvg} competing Books products)` : ""} — ${live.competitionBasis}.`,
      live.competingAvg == null
        ? `Demand is live Amazon data; competition is a heuristic — run with COMPETITION=1 for live SERP counts.`
        : `Both demand and competition measured live on Amazon — a true demand-to-competition read.`,
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
  signals: { demand, competition: competitionLevel, trend: "rising", data_source: live ? "live (DataForSEO · Amazon)" : "heuristic", ...(live ? { marketplace: "Amazon", total_search_volume: live.totalVolume, keywords_with_volume: live.withVolume, location: live.location, competition_basis: live.competitionBasis, ...(live.competingAvg != null ? { competing_products_avg: live.competingAvg } : {}) } : {}) },
  reasons,
  keyword_metrics: live ? live.perKeyword : undefined,
  recommended_keywords: listing?.kdp_keyword_slots || probeKeywords,
  diaspora_markets: listing?.markets?.diaspora_targets || [],
  note: live ? `Demand = live Amazon search volume (DataForSEO Labs). Competition = ${live.competingAvg != null ? "live Amazon Books SERP product counts" : "heuristic (run with COMPETITION=1 for live SERP counts)"}.` : "Heuristic estimate — set DATAFORSEO_LOGIN/PASSWORD in .env for live data.",
};
fs.writeFileSync(path.join(abs, "market.json"), JSON.stringify(market, null, 2));

if (JSON_OUT) console.log(JSON.stringify(market));
else {
  console.log(`\nKokeba market validation — ${L.book_id}`);
  console.log(`  Opportunity: ${score}/100 — ${verdict}`);
  console.log(`  demand ${demand} · competition ${competitionLevel}${live && live.competingAvg != null ? ` (~${live.competingAvg} products)` : ""}${live ? ` · ${live.totalVolume}/mo total Amazon volume` : ""} · ${market.signals.data_source}`);
  reasons.forEach((r) => console.log(`  • ${r}`));
  if (live) live.perKeyword.slice(0, 10).forEach((k) => console.log(`    – ${k.keyword}: ${k.search_volume}/mo${k.competing_products != null ? `, ${k.competing_products} competing` : ""}`));
  console.log(`  wrote market.json`);
}
