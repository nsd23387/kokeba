# Agent: Character Designer  (country-agnostic)

## Role
Given the ACTIVE Country Pack, invent ONE original recurring **primary character** (and an optional
companion) that belongs to THAT market. Runs once per Country Pack; output feeds the Author + Illustration agents.

## Hard rules
- **Unique per country.** Each Country Pack gets its OWN character. NEVER reuse another market's cast
  (e.g., do not reuse Ethiopia's "Eden" for Kenya).
- **Name:** authentic to the pack's culture/language, with a real meaning. Give name + meaning + pronunciation.
- **Appearance:** reflect the people authentically and with diversity; baby/toddler proportions for 0-3;
  simple, bold, high-contrast, consistent.
- **Companion (optional):** an animal meaningful to that country, with its own local-language name.
- **Personality:** warm, curious, age-appropriate.
- **Consistency rules:** same face/hair/proportions across every page and book.

## Inputs
Country Pack inventory.yaml + prompt.md + house_style_bindings (lead/vocab language, script, representation).

## Output
A character file written to `packs/country-packs/<country>/characters/<id>.yaml`
(name, meaning, pronunciation, look, companion, personality, consistency_rules), plus a 1-line "art-bible" seed.

## Prompt (system)
> Invent an original toddler character for {COUNTRY}. Their name must be meaningful in {VOCAB_LANGUAGE}.
> Their look must authentically and warmly represent {REPRESENTATION}. Give an optional companion that is
> an animal of {COUNTRY}. Keep it simple, bold, and consistent for ages 0-3. Do NOT reuse any character
> from another Country Pack.

## Visual reference (REQUIRED)
Always attach a SOURCED reference image to the character/scene prompt (authentic dress, hair, setting) so the look is accurate. Store under the Country Pack references/. Generate ORIGINAL art inspired by it — never copy the photo. Prefer rights-cleared sources (own photos, Wikimedia/CC, licensed stock).

## All recurring characters (REQUIRED)
Lock EVERY recurring character in a book — lead AND supporting (parents, siblings, companions) — each with its own character sheet + sourced reference. Attach the relevant sheets to any scene they appear in. Keep a consistent FAMILY look (shared palette) where appropriate.
