// Kokeba data-source clients. Run in Node 18+ with network access (e.g. via Codex).
// Sources + licenses are catalogued in data-sources/registry.yaml.
const UA = { headers: { "User-Agent": "KokebaResearchBot/0.1 (set-a-contact@example.com)" } };

// Public holidays — Nager.Date (free, no key, 100+ countries). iso2 e.g. "ET", "KE".
export async function holidays(iso2, year = new Date().getFullYear()) {
  const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${iso2}`, UA);
  return r.ok ? r.json() : [];
}
// Fauna presence — GBIF occurrence count for a species in a country (limit=0 -> just the count).
export async function gbifCount(iso2, scientificName) {
  const u = `https://api.gbif.org/v1/occurrence/search?country=${iso2}&scientificName=${encodeURIComponent(scientificName)}&limit=0`;
  const r = await fetch(u, UA); const j = await r.json(); return j.count ?? 0;
}
// Resolve a concept to a Wikidata Q-id.
export async function wikidataSearch(term, lang = "en") {
  const u = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(term)}&language=${lang}&format=json&type=item&limit=1&origin=*`;
  const r = await fetch(u, UA); const j = await r.json(); return j.search?.[0]?.id ?? null;
}
// Heritage-language label for a Q-id (CC0). lang e.g. "am" (Amharic), "sw" (Swahili).
export async function wikidataLabel(qid, lang) {
  const u = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels&languages=${lang}|en&format=json&origin=*`;
  const r = await fetch(u, UA); const j = await r.json();
  const L = j.entities?.[qid]?.labels ?? {}; return { en: L.en?.value, local: L[lang]?.value };
}
// CIA World Factbook (public domain JSON, no key). region e.g. "africa", slug e.g. "ethiopia".
export async function factbook(region, slug) {
  const u = `https://raw.githubusercontent.com/factbook/factbook.json/master/${region}/${slug}.json`;
  const r = await fetch(u, UA); return r.ok ? r.json() : null;
}
