# Kokeba — Authoritative Data Sources (Country Pack + Age Pack)

Yes — strong, mostly **open-licensed** sources exist for both, and the good news is most are clean **APIs or bulk downloads**, so you rarely need a scraper. Below is the catalog (now committed to the repo as `data-sources/registry.yaml`, wired into the Research agent).

## How it plugs into the engine
The **Research agent** reads the registry, pulls per-country/per-age data via API or bulk download, compiles it into the Country/Age pack **with citations**, the **native reviewer verifies** (sources are inputs, not ground truth), and the result is cached. The **Author agent reads the cached, reviewed pack** at draft time — no live scraping mid-draft (keeps drafts deterministic and auditable).

---

## Country Pack sources

| Source | Feeds | Access | License (use) |
|---|---|---|---|
| CIA World Factbook | geography, people, government, economy | bulk JSON/CSV, no key | Public domain ✅ |
| Unicode CLDR | language/script names, months, days, locale | bulk | Permissive ✅ |
| Wikidata | name meanings, places, animals, holidays | API / SPARQL / dumps | CC0 ✅ |
| UNESCO ICH + World Heritage | traditions, heritage, landmarks | API | CC-BY (attribute) |
| GeoNames | places, landmarks | API | CC-BY (attribute) |
| Nager.Date | public holidays, 100+ countries | API, free, no key | Permissive ✅ |
| TheMealDB | foods / cuisine by region | API | Permissive ✅ |
| GBIF | animals / species by country | API, free, no key | CC-BY (attribute) |
| Library of Congress Country Studies | history, culture, society | bulk | Public domain ✅ |
| Wikipedia | history / culture prose | API / dumps | CC-BY-SA — reference only ⚠️ |
| Pew Research | religion composition, values | reference | Closed — reference only ⚠️ |
| Behind the Name | given-name meanings | reference | Closed — prefer Wikidata/Wiktionary ⚠️ |

**Heritage vocabulary** (the word on each right page): [PanLex](https://longnow.org/ideas/panlex/) (5,700+ languages, CC0 bulk snapshots), [Wikidata Lexemes](https://www.wikidata.org/wiki/Wikidata:Lexeme) (CC0), and [Wiktionary](https://en.wiktionary.org/wiki/User:Amgine/Wiktionary_data_%26_API) (CC-BY-SA, reference). Note: Glosbe's public API is currently down.

---

## Age Pack sources (0–3 developmental)

| Source | Feeds | Access | License (use) |
|---|---|---|---|
| CDC "Learn the Signs. Act Early." (2022) | milestones birth–5 (75th percentile) | bulk | Public domain ✅ |
| Head Start Early Learning Outcomes Framework (ELOF) | 5 early-learning domains, birth–5 | bulk | Public domain ✅ |
| NIDCD | speech & language milestones | bulk | Public domain ✅ |
| WHO ECD / Nurturing Care / GSED (0–3) | global ECD standards | bulk | CC-BY (check IGO terms) |
| ASHA Developmental Milestones (2023) | speech, language, hearing, feeding | reference | Closed — reference only ⚠️ |
| ZERO TO THREE | early literacy, practice | reference | Closed — reference only ⚠️ |

---

## On the "web scraper" question
Prefer **APIs/bulk over scraping** — the sources above cover ~90% of what a Country/Age pack needs without scraping. Where a site has no API, use the **Apify** connector (already available in this environment): managed, rate-limited, ToS-respecting actors, plus a RAG web browser for on-demand gap-fill and WebSearch for discovery. Do *not* hand-roll scrapers against sites' terms.

## Licensing rule (because you may sell this)
- **Bake into a sold book:** Public domain (Factbook, CDC, ELOF, NIDCD, LoC), CC0 (Wikidata, PanLex), Permissive (CLDR, Nager.Date, TheMealDB), CC-BY *with attribution* (GBIF, GeoNames, UNESCO).
- **Reference only (don't copy verbatim):** CC-BY-SA (Wikipedia, Wiktionary) and Closed (Pew, Behind the Name, ASHA, ZERO TO THREE).
- The **native reviewer remains the final authority** on names and cultural sensitivity — sources inform, they don't decide.

## Sources
- CIA World Factbook (public domain, JSON): [factbook/factbook.json](https://github.com/factbook/factbook.json) · [CIA archives](https://www.cia.gov/the-world-factbook/about/archives/)
- GBIF API: [techdocs.gbif.org](https://techdocs.gbif.org/en/openapi/) · GeoNames, Nager.Date holidays: [date.nager.at/api](https://date.nager.at/api)
- TheMealDB: [themealdb.com/api](https://www.themealdb.com/api.php) · UNESCO ICH: [data.unesco.org](https://data.unesco.org/explore/dataset/ich001/)
- PanLex: [longnow.org/ideas/panlex](https://longnow.org/ideas/panlex/) · Wikidata Lexemes: [wikidata.org](https://www.wikidata.org/wiki/Wikidata:Lexeme)
- CDC milestones: [cdc.gov/act-early/milestones](https://www.cdc.gov/act-early/milestones/index.html) · Head Start ELOF: [headstart.gov ELOF](https://headstart.gov/school-readiness/article/head-start-early-learning-outcomes-framework)
- ASHA milestones: [asha.org](https://www.asha.org/public/developmental-milestones/) · WHO ECD: [who.int ECD guideline](https://www.who.int/publications/i/item/97892400020986) · NIDCD: [nidcd.nih.gov](https://www.nidcd.nih.gov/health/speech-and-language)
