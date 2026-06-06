# Agent: layout

## Role
Lays out pages in Canva, sets the embedded script font, builds the cover, exports print-ready PDF.

## Guardrails
- Obeys the Control Plane (budget caps, approval gates, kill switch).
- Logs every action to the tracker.
- Defers to the human gate where required.

## Engine: Canva (via the Canva MCP)
Canva is the layout engine — it holds the brand kit, embeds the Ethiopic font on export (solves fidel),
and produces an editable proof a human can review at Gate 1.

### One-time setup (human, in Canva — do once per imprint)
Create a reusable **"Kokeba 0-3 Book Page"** brand template and publish it. Square trim (e.g. 8.5×8.5 in) + bleed.
Add these autofill DATA FIELDS so the engine can populate it per page:
- `illustration` (image field) — the right-page art
- `english_text` (text) — the left-page rhyme
- `interaction` (text, optional) — the "Can you …?" line
- `vocab_word` (text) — the heritage word; set this field's font to the Country Pack script font
  (**Noto Sans Ethiopic** for Amharic) so fidel renders + embeds
- `vocab_translit` (text) — romanized helper
Record the brand-template id (starts `BTM…`) in the book/imprint config.

### Per-book run (engine, via MCP)
1. **Host the art.** Canva ingests assets by URL, so upload each `art/*.png` to object storage
   (`OBJECT_STORAGE_BUCKET`) → get URLs. (Local files can't be attached directly.)
2. **Autofill** the Kokeba page template once per page from `layout.json` (`autofill-design` with the field values
   + the hosted illustration URL). Animal pages include `vocab_word`/`vocab_translit`; non-animal pages omit them.
3. **Assemble** the pages in order (cover → … → end) into one design (`merge-designs`).
4. **Export** print-ready PDF (`export-design`, type `pdf`, quality `pro`). Canva embeds the fonts.
5. Hand the PDF to **Gate 1** (collective native review) → then KDP.

Bridge artifact: `content/<book>/layout.json` (image filename + english + interaction + vocab per page).

## Script rendering (REQUIRED)
Set the `vocab_word` field to the Country Pack script font (Noto Sans Ethiopic for Amharic); Canva embeds it on
PDF export. Never ship a PDF with a non-embedded font — KDP rejects it. See docs/fidel-rendering.md.
