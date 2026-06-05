// Verify a book's animal vocabulary + fauna against authoritative sources.
// Usage: node scripts/verify/verify-book.mjs <country-iso2> <vocabLang> <manifest.json>
// manifest.json: [{ "en":"lion", "word":"አንበሳ", "sci":"Panthera leo" }, ...]
import { gbifCount, wikidataSearch, wikidataLabel } from "../ingest/sources.mjs";
import { readFile } from "node:fs/promises";

const [iso2, vocabLang, manifestPath] = process.argv.slice(2);
const items = JSON.parse(await readFile(manifestPath, "utf8"));
let pass = 0, flag = 0;
for (const it of items) {
  const inCountry = (await gbifCount(iso2, it.sci)) > 0;
  const qid = await wikidataSearch(it.en);
  const auth = qid ? (await wikidataLabel(qid, vocabLang)).local : null;
  const wordMatch = auth && it.word && auth.trim() === it.word.trim();
  const status = wordMatch && inCountry ? "PASS" : "FLAG";
  if (status === "PASS") pass++; else flag++;
  console.log(`${status}  ${it.en.padEnd(10)} book="${it.word}"  authoritative(${vocabLang})="${auth ?? "?"}"  native_fauna=${inCountry}`);
}
console.log(`\n${pass} pass · ${flag} flag — FLAGs go to the native reviewer (Gate 1). Sources are inputs, not final authority.`);
