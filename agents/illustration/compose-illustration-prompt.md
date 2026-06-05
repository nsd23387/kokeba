# Illustration Agent — prompt composition (modular)
Each scene's image prompt is ASSEMBLED, so the look stays locked and country-agnostic.

```
[ Style Guide ]      packs/style/illustration-style-guide.md     (brand look — same for every country)
[ Character Sheet ]  packs/country-packs/<country>/characters/<id>.sheet.md  (the LOCKED visual + ref image)
[ Age visual rules ] packs/age-range-packs/<band>/development.yaml (0-3: one subject, high-contrast, big)
[ House Style ]      docs/kokeba-writing-guidelines.md            (right page = 1 illustration, no text in art)
[ Scene ]            the spread's art note (from the book's art-prompts)
[ Reference image ]  REQUIRED — a sourced authentic photo (references/) for clothing/hair/setting; inspire, don't copy
        =
   1) FIRST generate the character reference sheet -> lock it.
   2) For each spread: prepend the Style Guide block + attach the character sheet as a REFERENCE IMAGE,
      then add the scene. Use the chosen model (default gpt-image-2) with a fixed style seed.
   3) Output: one image per spread, consistent character + style, NO text baked in.
   -> Layout places art + adds the fidel vocab -> COLLECTIVE native review (Gate 1) on the proof.
```
Pick the model/tool per the art-direction intake. Never reuse another country's character.
