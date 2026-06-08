#!/usr/bin/env node
// Kokeba Opportunity Scout — turns live Amazon demand/competition into a ranked list of the
// NEXT books to make. Two modes:
//   (default) THEME scan  — for one heritage language, score concept archetypes
//                           (alphabet, numbers, colors, animals, …) → which book next.
//   --languages a,b,c     — LANGUAGE scan — score a compact core set per language
//                           → which heritage language to expand into next.
//
// Cost-aware: demand is ONE batched search-volume call; competition (SERP) is only spent on
// the top candidates by demand. Falls back to a static prior if creds/network are absent.
//
// Usage:
//   node scripts/market/scout-opportunities.mjs <book-dir> [--top N] [--json]
//   node scripts/market/scout-opportunities.mjs --lang amharic [--country ethiopia]
//   node scripts/market/scout-opportunities.mjs --languages amharic,swahili,somali,yoruba
// Env: DATAFORSEO_LOGIN/PASSWORD (live), DATAFORSEO_LOCATION (default "United States")

import fs from "node:fs";
import path from "node:path";
import { hasCreds, amazonSearchVolume, amazonResultsCount } from "../lib/dataforseo.mjs";

const args = process.argv.slice(2);
const flag = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const has = (n) => args.includes(n);
const JSON_OUT = has("--json");
const TOP = Number(flag("--top", 8));
const location = process.env.DATAFORSEO_LOCATION || "United States";

// resolve context: a book dir, or explicit --lang/--languages
const bookDir = args[0] && !args[0].startsWith("--") ? args[0] : null;
let heritage = flag("--lang"), country = flag("--country");
if (bookDir) {
  const L = JSON.parse(fs.readFileSync(path.resolve(bookDir, "layout.json"), "utf8"));
  const code = (L.languages || ["en", "am"]).find((x) => x !== "en") || "am";
  heritage = heritage || { am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba", so: "Somali", ti: "Tigrinya", om: "Oromo" }[code] || code;
  country = country || (L.book_id || "").split("-")[0];
}
heritage = heritage || "Amharic";
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// concept archetypes → keyword probes + the book they imply
const CONCEPTS = [
  { id: "alphabet",   theme: "Alphabet / fidel",   kw: ["{l} alphabet", "{l} abc book"],          title: "{H} Alphabet Book" },
  { id: "numbers",    theme: "Numbers / counting",  kw: ["{l} numbers", "{l} counting book"],       title: "{H} Numbers & Counting" },
  { id: "colors",     theme: "Colors",              kw: ["{l} colors", "{l} colours"],              title: "{H} Colors Book" },
  { id: "first-words",theme: "First words",         kw: ["{l} first words", "{l} for kids"],        title: "{H} First Words" },
  { id: "animals",    theme: "Animals",             kw: ["{l} animals", "{l} animal book"],         title: "{H} Animals Book" },
  { id: "food",       theme: "Food & kitchen",      kw: ["{l} food words", "{l} kitchen words"],    title: "{H} Food Words" },
  { id: "family",     theme: "Family",              kw: ["{l} family words", "{l} family book"],     title: "{H} Family Words" },
  { id: "body",       theme: "My body",             kw: ["{l} body parts", "{l} my body"],          title: "{H} My Body Words" },
  { id: "greetings",  theme: "Greetings",           kw: ["{l} greetings", "{l} hello book"],        title: "{H} Greetings Book" },
  { id: "bilingual",  theme: "Bilingual story",     kw: ["bilingual books for kids", "bilingual books for toddlers"], title: "{H}–English Bilingual Story" },
];

// static prior (used when no live data) — rough hand-ranking of evergreen kid-book demand
const PRIOR = { alphabet: 80, "first-words": 75, numbers: 70, animals: 68, colors: 62, bilingual: 60, greetings: 45, family: 44, food: 42, body: 40 };

const expand = (s, l) => s.replaceAll("{l}", l).replaceAll("{H}", cap(l));

// scoring: blend demand (log-scaled) and competition (banded) into 0–100 + a ratio
const demandScore = (vol) => Math.min(100, Math.round(18 * Math.log10(vol + 1)));
const compPenalty = (c) => (c == null ? 20 : c < 200 ? 5 : c < 1000 ? 15 : c < 5000 ? 35 : 55);
const compLevel = (c) => (c == null ? "unknown" : c < 200 ? "very low" : c < 1000 ? "low" : c < 5000 ? "medium" : "high");
const oppScore = (vol, c) => Math.max(0, Math.min(100, Math.round(demandScore(vol) * 0.6 + (100 - compPenalty(c)) * 0.4)));

async function scoreCandidates(candidates) {
  // candidates: [{ key, label, title, keywords: [...] }]
  const allKw = [...new Set(candidates.flatMap((c) => c.keywords.map((k) => k.toLowerCase())))];
  let vols = {};
  const live = hasCreds();
  if (live) { try { vols = await amazonSearchVolume(allKw, { location }); } catch (e) { console.error(`volume lookup failed (${e.message}); using prior.`); } }
  const haveVol = Object.keys(vols).length > 0;

  // demand per candidate = best (max) volume across its keyword variants
  let scored = candidates.map((c) => {
    const per = c.keywords.map((k) => ({ keyword: k.toLowerCase(), volume: vols[k.toLowerCase()] ?? 0 })).sort((a, b) => b.volume - a.volume);
    const demand = per[0]?.volume || 0;
    return { ...c, best_keyword: per[0]?.keyword || c.keywords[0], demand, per };
  });

  if (!haveVol) {
    // no live data → rank by static prior
    const ranked = scored.map((c) => ({ ...c, opportunity: PRIOR[c.key] ?? 50, competition: null, competition_level: "unknown", ratio: null }))
      .sort((a, b) => b.opportunity - a.opportunity);
    return { ranked, live: false };
  }

  // spend SERP competition credits only on the top-N by demand
  scored.sort((a, b) => b.demand - a.demand);
  for (let i = 0; i < scored.length; i++) {
    if (i < TOP && scored[i].demand > 0) {
      try { scored[i].competition = await amazonResultsCount(scored[i].best_keyword, { location, department: "Books" }); }
      catch (e) { scored[i].competition = null; }
    } else scored[i].competition = null;
  }
  const ranked = scored.map((c) => ({
    ...c,
    competition_level: compLevel(c.competition),
    ratio: c.competition ? Math.round((c.demand / c.competition) * 10) / 10 : null,
    opportunity: oppScore(c.demand, c.competition),
  })).sort((a, b) => b.opportunity - a.opportunity || (b.ratio || 0) - (a.ratio || 0));
  return { ranked, live: true };
}

let out;
if (has("--languages")) {
  // LANGUAGE scan: which heritage language to expand into next
  const langs = flag("--languages").split(",").map((s) => s.trim()).filter(Boolean);
  const candidates = langs.map((l) => ({ key: l, label: cap(l), title: `${cap(l)} children's book line`, keywords: [l.toLowerCase(), `${l.toLowerCase()} alphabet`, `${l.toLowerCase()} for kids`] }));
  const { ranked, live } = await scoreCandidates(candidates);
  out = { mode: "language", location, generated_at: new Date().toISOString(), data_source: live ? "live (DataForSEO · Amazon)" : "prior (no live data)", recommendations: ranked };
} else {
  // THEME scan: which book to make next in this heritage language
  const candidates = CONCEPTS.map((c) => ({ key: c.id, label: c.theme, title: expand(c.title, heritage.toLowerCase()), keywords: c.kw.map((k) => expand(k, heritage.toLowerCase())) }));
  const { ranked, live } = await scoreCandidates(candidates);
  out = { mode: "theme", heritage, country: country || null, location, generated_at: new Date().toISOString(), data_source: live ? "live (DataForSEO · Amazon)" : "prior (no live data)", recommendations: ranked };
}

// recommendation = concrete next-book brief
out.recommendations = out.recommendations.map((r, i) => ({
  rank: i + 1, concept: r.key, theme: r.label, proposed_title: r.title,
  opportunity_score: r.opportunity, demand: r.demand ?? null, competition: r.competition ?? null,
  competition_level: r.competition_level, demand_competition_ratio: r.ratio, best_keyword: r.best_keyword,
}));

const dest = bookDir ? path.resolve(bookDir, "market-opportunities.json") : path.resolve(process.cwd(), "market-opportunities.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2));

if (JSON_OUT) console.log(JSON.stringify(out));
else {
  console.log(`\nKokeba Opportunity Scout — ${out.mode} scan${out.heritage ? ` · ${out.heritage}` : ""} (${out.data_source})`);
  out.recommendations.slice(0, 10).forEach((r) => {
    const bits = [`demand ${r.demand ?? "—"}`, `competition ${r.competition ?? "—"} (${r.competition_level})`, r.demand_competition_ratio != null ? `ratio ${r.demand_competition_ratio}` : ""].filter(Boolean).join(" · ");
    console.log(`  ${r.rank}. [${r.opportunity_score}] ${r.proposed_title}  —  ${bits}`);
  });
  console.log(`  → wrote ${path.basename(dest)}`);
}
