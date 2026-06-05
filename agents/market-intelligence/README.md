# market-intelligence agent
Studies what kids' books sell fast (BSR, reviews, keywords, covers, price) from licensed data — never scrapes Amazon directly.

Contract in io.schema.ts · tools in tools.ts · golden tests in evals/.

## Authoritative data sources
This agent also ingests data-sources/registry.yaml (Factbook, CLDR, Wikidata, GBIF, GeoNames, Nager.Date, UNESCO, PanLex; CDC/Head Start ELOF/WHO for the age pack) to compile Country/Age packs with citations. Prefer APIs/bulk; scrape via Apify only where no API exists; native reviewer is final.
