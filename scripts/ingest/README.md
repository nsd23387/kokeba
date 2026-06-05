# Ingest + Verify (runnable in Node 18+, network required — e.g. via Codex)
Implements data-sources/registry.yaml.

## Build/refresh a Country Pack's sourced data
    node scripts/ingest/build-country-pack.mjs ethiopia ET africa am
    node scripts/ingest/build-country-pack.mjs kenya KE africa sw
Writes packs/country-packs/<pack>/sources/{holidays,fauna-vocab,factbook}.json with citations.

## Verify a book against the sources
    node scripts/verify/verify-book.mjs ET am content/examples/ethiopia-0-3/eden-goes-to-the-zoo/animals.verify.json
Prints PASS/FLAG per animal (Amharic word vs Wikidata + native-fauna via GBIF). FLAGs -> native reviewer.

Prefer these APIs/bulk; scrape (Apify) only where no API. The native reviewer is the FINAL authority.
