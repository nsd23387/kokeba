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
- Listing (SEO+GEO): `node scripts/metadata/build-listing.mjs <book-dir>` (title, categories, age; SEO search terms + GEO entities/FAQ/AI-summary + diaspora market targeting → `listing-metadata.json`. Worker runs it in compliance. The 7 KDP backend keyword slots are **ranked by live Amazon search volume** when `DATAFORSEO_LOGIN`/`PASSWORD` are set — head terms that actually carry volume win over dead long-tails — falling back to templated priority order otherwise; each phrase still passes the Amazon-rule validation, and live volume is recorded per phrase in `keyword_validation`.)
- Validate PDFs: `node scripts/validate/validate-pdf.mjs <book-dir>` (interior/cover MediaBox dimensions vs trim+bleed, page count, fonts-embedded. Worker runs it after export; exit 1 on FAIL.)
- Ebook (Kindle): `node scripts/ebook/build-epub.mjs <book-dir>` (fixed-layout EPUB3 with per-page alt-text + accessibility metadata → `book.epub`; packaged with `zip`. Worker runs it in export.)
- Market validation: `node scripts/market/validate-topic.mjs <book-dir>` (demand-vs-competition opportunity score 0–100 + go/no-go verdict for a heritage-language title → `market.json`. Uses **live DataForSEO Labs Amazon search volume** for demand when `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` are set — measured on Amazon, the buying marketplace, NOT Google — probing broadened head terms + the book's keyword slots; competition defaults to a heuristic for the thin heritage-language KDP niche. Set `COMPETITION=1` (or pass `--competition`) to measure **real competition** — it counts competing Books-department products via the Amazon SERP endpoint for the top keywords, giving a true demand-to-competition read (costs extra SERP credits, so it's opt-in). With competition on, it also flags the single **best keyword pocket** (highest demand-to-competition ratio) in `market.json`. Falls back to a full heuristic if creds are missing/unreachable; `--no-live` forces heuristic. Worker runs it in the **research** stage so weak topics surface before you invest in art. Shared DataForSEO client: `scripts/lib/dataforseo.mjs`.)
- Opportunity Scout (what to make NEXT): `node scripts/market/scout-opportunities.mjs <book-dir>` ranks next-book **concept archetypes** (alphabet, numbers, colors, animals, first words, …) for the book's heritage language by live Amazon demand/competition ratio → `market-opportunities.json` + a ranked list of proposed titles. `--languages amharic,swahili,somali,yoruba` switches to a **language scan** (which heritage language to expand into next). Cost-aware: demand is one batched call, SERP competition is spent only on the top `--top N` (default 8) by demand; falls back to a static prior with no creds. Worker runs it in **research** when `SCOUT=1`, posting to the console's "Next-book opportunities" panel — this is the portfolio/agent feedback signal for choosing the next title.
- Narration (read-aloud): `node scripts/audio/build-narration.mjs <book-dir>` (OpenAI TTS per-page mp3s + concatenated `audiobook.mp3` via ffmpeg; vocab lines spoken as "In <heritage>, <word> is <translit>." Use `--dry-run` to preview text. Opt-in in the worker via `NARRATION=1` during the layout stage; needs `IMAGE_GEN_API_KEY`, `TTS_MODEL`/`TTS_VOICE` optional.)
- Push to GitHub: `bash ../push-to-github.sh` (remote: git@github.com:nsd23387/kokeba.git)

## Hard rules (do not violate)
1. Country-agnostic: resolve language/script/representation from the active Country Pack — never hard-code Amharic.
2. House style: left page = lead-language rhyme ONLY; right page = illustration + one vocab-language word
   (script + transliteration), NOT in the rhyme; one interaction per discovery spread.
3. Each country gets its OWN character (run the Character Designer); never reuse another market's cast.
4. Gates: every title needs native-speaker review (Gate 1) + the Compliance pre-flight before publish.
5. Sources are inputs, not ground truth — the native reviewer is final on names + cultural sensitivity.
6. Market gate: the **author** stage is hard-blocked when the research-stage opportunity score is below `MARKET_MIN_SCORE` (default 50). A human can clear it per-book via `POST /api/books/:id/market/override` (the console's Market panel has an "Override & author anyway" button). Don't invest in art for a title the data says won't sell — unless you consciously override.
