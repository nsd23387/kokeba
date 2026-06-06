# scripts/illustrate — scene image generator

Generates every page image for a book from its `scenes.json`, attaching the
**locked character reference sheets** so the character + wardrobe stay consistent.

## What it does
1. Reads `<book-dir>/scenes.json` (shared style/identity/setting block + per-scene prompts + which refs to attach).
2. Composes each full prompt (`shared_block` + scene prompt).
3. Calls the image provider (`providers/openai.mjs` → OpenAI gpt-image **edit** endpoint with the refs attached).
4. Saves PNGs to `<book-dir>/art/` as `cover.png`, `s01.png` … `s11.png`.

## Setup
```bash
pnpm add openai          # one-time (adds the OpenAI SDK)
cp .env.example .env     # then set IMAGE_GEN_API_KEY (OpenAI key with image-gen access)
```
Env knobs: `IMAGE_GEN_MODEL` (default gpt-image-1), `IMAGE_GEN_QUALITY` (high), `IMAGE_GEN_SIZE` (1024x1024).

## Run
```bash
# validate everything WITHOUT calling the API (no key needed):
node scripts/illustrate/generate-scenes.mjs content/examples/ethiopia-0-3/eden-goes-to-the-zoo --dry-run

# generate the whole book:
node scripts/illustrate/generate-scenes.mjs content/examples/ethiopia-0-3/eden-goes-to-the-zoo

# one or a few scenes:
node scripts/illustrate/generate-scenes.mjs <book-dir> --only s03
node scripts/illustrate/generate-scenes.mjs <book-dir> --only cover,s03,s04

# overwrite existing files:
node scripts/illustrate/generate-scenes.mjs <book-dir> --force
```
Existing PNGs are skipped unless `--force`, so re-running only fills in what's missing.

## Reference sheets (must exist first)
The book's `scenes.json` `refs` map points at the locked sheets, e.g.:
```
"refs": { "eden": "art/eden_everyday_ref.png", "mama": "art/mama_everyday_ref.png" }
```
Generate those once via the Character Designer prompts in
`packs/country-packs/<country>/characters/*.everyday-refsheet-prompt.md` (casual)
or `*.refsheet-prompt.md` (formal), and save into the book's `art/` folder.

## Swapping providers
`providers/openai.mjs` exports `{ name, ready(), generate({prompt, refPaths, size}) }`.
Drop in a `recraft.mjs` / `firefly.mjs` with the same shape and point the import at it.

## Next stage
After art is generated → **layout** (place art + English left page + embedded fidel vocab) →
assemble the proof → collective native-speaker review (Gate 1).
