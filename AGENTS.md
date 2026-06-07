# AGENTS.md — Kokeba (read by Codex)
Country-agnostic AI-agent platform that produces children's books. Built/run with **Codex**.

## What this repo is
- `packs/` — swappable content: Country Packs (inventory + prompt + house_style_bindings + characters)
  and Age-Range Packs (developmental prompt). `story-frameworks/` = proven structures.
- `agents/` — agent specs: orchestrator, market-intelligence (research), author, illustration, layout,
  compliance, character-designer, marketing. Author prompt = Country + Age + Framework + House Style + Intake.
- `docs/kokeba-writing-guidelines.md` — the HOUSE STYLE (country-agnostic). Always follow it.
- `data-sources/registry.yaml` — authoritative sources the research step ingests (Factbook, GBIF, Wikidata,
  Nager.Date, PanLex, CDC, Head Start ELOF…). Prefer APIs/bulk; scrape via Apify only where no API.
- `content/examples/` — generated books (e.g. Eden / Zuri).

## How to run (Codex executes these)
- Ingest a country's data:  `node scripts/ingest/build-country-pack.mjs ethiopia ET africa am`
- Verify a book vs sources: `node scripts/verify/verify-book.mjs ET am content/examples/ethiopia-0-3/eden-goes-to-the-zoo/animals.verify.json`
- Generate a book's art:    `node scripts/illustrate/generate-scenes.mjs content/examples/ethiopia-0-3/eden-goes-to-the-zoo`
  (lock the character reference sheets first; reads the book's `scenes.json`; needs `IMAGE_GEN_API_KEY`; `pnpm add openai` once. `--dry-run` validates without the API. `--only s03 --force` re-rolls one scene.)
- Render the book proof:     `node scripts/layout/build-book.mjs content/examples/ethiopia-0-3/eden-goes-to-the-zoo`
  (reads `layout.json` + `art/`; writes `proof.html` in the approved square template; open it and Print -> Save as PDF. Fidel embeds via Noto Sans Ethiopic.)
- Pre-flight QA (before Gate 1): `node scripts/preflight/check-book.mjs content/examples/ethiopia-0-3/eden-goes-to-the-zoo`
  (deterministic checks: predator moats, animal-ref consistency, refs/art present + square/non-blank, fidel present. Exit 1 on FAIL; the worker runs it after layout and stores results for the UI. FAIL hard-blocks Gate 1 + compliance + export.)
- Vision QA (pixel-level, opt-in): `IMAGE_GEN_API_KEY=… VISION_MODEL=gpt-4o-mini node scripts/preflight/vision-check.mjs <book-dir>`
  (sends each page + reference images to a vision model; flags consistency/floating/rendering/proximity/scariness. Advisory. Worker runs it when `VISION_QA=1`.)
- Compliance: `node scripts/compliance/check-compliance.mjs <book-dir>` (CPSIA/COPPA/AI-disclosure/BISAC/reading-age/DPI/trim/spine + writes `kdp-metadata.json`).
- Provenance: `node scripts/provenance/build-provenance.mjs <book-dir>` (models, per-page prompt hash/refs/feedback, contributors, human-authorship, sources → `provenance.json` + `provenance.md`; the worker runs it in the compliance stage and the API merges runtime QA + gate approvals).
- Upscale to print res: `node scripts/upscale/upscale-art.mjs <book-dir>` (Lanczos upscale to >=300 DPI at trim; needs `npm i sharp`. Pipeline stage `upscale` runs after layout so the DPI check passes.)
- Export PDF: `node scripts/export/build-pdf.mjs <book-dir>` (headless Chromium → `interior.pdf` single pages + `cover.pdf` wrap w/ computed spine + `book.pdf` proof; needs `npm i -D puppeteer`).
- Listing (SEO+GEO): `node scripts/metadata/build-listing.mjs <book-dir>` (title, 7 keywords, categories, age; SEO search terms + GEO entities/FAQ/AI-summary + diaspora market targeting → `listing-metadata.json`. Worker runs it in compliance.)
- Validate PDFs: `node scripts/validate/validate-pdf.mjs <book-dir>` (interior/cover MediaBox dimensions vs trim+bleed, page count, fonts-embedded. Worker runs it after export; exit 1 on FAIL.)
- Push to GitHub: `bash ../push-to-github.sh` (remote: git@github.com:nsd23387/kokeba.git)

## Hard rules (do not violate)
1. Country-agnostic: resolve language/script/representation from the active Country Pack — never hard-code Amharic.
2. House style: left page = lead-language rhyme ONLY; right page = illustration + one vocab-language word
   (script + transliteration), NOT in the rhyme; one interaction per discovery spread.
3. Each country gets its OWN character (run the Character Designer); never reuse another market's cast.
4. Gates: every title needs native-speaker review (Gate 1) + the Compliance pre-flight before publish.
5. Sources are inputs, not ground truth — the native reviewer is final on names + cultural sensitivity.
