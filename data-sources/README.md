# Kokeba Data Sources
Authoritative, mostly open-licensed sources the **Research agent** ingests to build and verify packs.
See registry.yaml for the machine-readable list (id, what it feeds, access, license, redistributable).

## How it plugs in (no scraping mid-draft)
1. Research agent reads registry.yaml and pulls per-country / per-age data via API or bulk download.
2. It compiles results into the Country Pack inventory + prompt (and the Age Pack), WITH citations.
3. The native reviewer verifies (Gate 1) — sources are INPUTS, not ground truth, especially for names + sensitivity.
4. The compiled pack is cached; the Author agent reads the cached, reviewed pack at draft time.

## Prefer APIs/bulk over scraping
Most needs are covered by clean APIs / open dumps (Factbook, CLDR, Wikidata, GBIF, GeoNames, Nager.Date,
TheMealDB, UNESCO, PanLex). Only scrape where no API exists — via the **Apify** connector (managed,
rate-limited, ToS-respecting), with the RAG web browser for gap-fill and WebSearch for discovery.

## Licensing (because we may sell this)
- Safe to bake into a sold book: **PD** (CIA Factbook, CDC, Head Start ELOF, NIDCD, LoC), **CC0** (Wikidata,
  PanLex), **PERMISSIVE** (CLDR, Nager.Date, TheMealDB), **CC-BY** with attribution (GBIF, GeoNames, UNESCO).
- **Reference only** (don't copy verbatim into the product): **CC-BY-SA** (Wikipedia, Wiktionary) and
  **CLOSED** (Pew, Behind the Name, ASHA, ZERO TO THREE).
