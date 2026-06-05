// Pull authoritative data for a country and write cited JSON into the pack's sources/ folder.
// Usage: node scripts/ingest/build-country-pack.mjs ethiopia ET africa
import { holidays, gbifCount, wikidataSearch, wikidataLabel, factbook } from "./sources.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const [pack = "ethiopia", iso2 = "ET", region = "africa", vocabLang = "am"] = process.argv.slice(2);
const ANIMALS = [
  ["lion", "Panthera leo"], ["African elephant", "Loxodonta africana"],
  ["giraffe", "Giraffa camelopardalis"], ["hippopotamus", "Hippopotamus amphibius"],
  ["leopard", "Panthera pardus"], ["dromedary camel", "Camelus dromedarius"],
  ["grivet monkey", "Chlorocebus aethiops"],
];

const out = `packs/country-packs/${pack}/sources`;
await mkdir(out, { recursive: true });

const hol = await holidays(iso2);
await writeFile(`${out}/holidays.json`, JSON.stringify({ source: "Nager.Date", iso2, data: hol }, null, 2));

const fauna = [];
for (const [en, sci] of ANIMALS) {
  const count = await gbifCount(iso2, sci);           // presence signal
  const qid = await wikidataSearch(en);
  const label = qid ? await wikidataLabel(qid, vocabLang) : {};
  fauna.push({ en, scientificName: sci, gbif_occurrences_in_country: count, qid, vocab_word: label.local });
}
await writeFile(`${out}/fauna-vocab.json`, JSON.stringify({ sources: ["GBIF", "Wikidata"], vocabLang, fauna }, null, 2));

const fb = await factbook(region, pack);
if (fb) await writeFile(`${out}/factbook.json`, JSON.stringify({ source: "CIA World Factbook (public domain)", data: fb }, null, 2));

console.log(`Wrote ${out}/{holidays,fauna-vocab,factbook}.json`);
console.table(fauna.map(f => ({ animal: f.en, in_country: f.gbif_occurrences_in_country > 0 ? "yes" : "check", vocab: f.vocab_word })));
