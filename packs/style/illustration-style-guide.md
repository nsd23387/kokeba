# Kokeba Illustration Style Guide (brand-level, country-agnostic)
> Locks the LOOK so every book — any country — is recognizably Kokeba. The character is per-country
> (see each Country Pack's character sheet); the STYLE below is shared. Injected into the Illustration agent.

## Medium & look (locked by the approved Eden reference sheet)
- Soft, warm, painterly storybook illustration: gentle shading, subtle texture, rounded friendly shapes, cozy warm lighting.
- No hard outlines; chunky baby-friendly forms. (This replaced the earlier 'flat vector' after the approved Eden sheet.)

## Composition
- ONE hero subject per page (the child + one key animal/object). Lots of clean negative space.
- Clear, readable emotion on the character. Never cluttered.
- NO text inside the illustration — text is added at layout (so it stays localizable).
- **TEXT-SAFE ZONE.** Keep the bottom ~18% of every illustration a calm, simple area (ground/sky/water — no
  faces, feet, hands, or key subjects). On square trims the heritage word is set in a band over this strip; the
  safe zone means it never crops or covers anything important. Keep characters + main action upper/middle.

## Palette
- Brand: navy #222B6D, gold #C9A227, white #FFFFFF, cream #E7D7A6.
- Plus 1–2 warm accent colors per book. White is the breathing room.

## Lighting & mood
- Bright, warm, even light; soft shadows. Wonder, joy, safety.

## Representation
- Authentic and diverse to the active Country Pack (skin tones, hair, dress). Respectful, never stereotyped.

## Consistency method (CRITICAL for a series)
1. First generate a CHARACTER REFERENCE SHEET (front + 3/4 views, expression row) and lock it.
2. Use that sheet as a reference image on EVERY scene generation; keep the same model + style seed.
3. **Lock IDENTITY, vary WARDROBE.** What stays identical every page/book: face, skin, hair + signature accessory
   (e.g. Eden's gold star clip), proportions. What CHANGES to fit the scene: the OUTFIT. Match clothing formality
   to the occasion — everyday/casual clothes for everyday scenes (zoo, home, play); reserve traditional/ceremonial
   dress for covers and holiday titles.
4. **A reference image OVERRIDES text — so lock one reference PER WARDROBE.** The model copies the clothing it
   SEES in the attached sheet; telling it in words to "change to casual" is unreliable and usually loses to the
   outfit in the image. Therefore generate, once, a reference sheet for EACH outfit the character needs:
   - `…_ref.png` — formal/traditional (covers, holiday books)
   - `…_everyday_ref.png` — everyday casual (zoo, home, play)
   Make each variant by attaching the FIRST locked sheet (for identity) and re-dressing only the outfit, then lock
   the result. On a scene, attach the variant whose formality matches the scene. Keep the same model + style seed.

## Tools (pick per the intake; all viable)
- **gpt-image-2 (ChatGPT Images 2.0)** — default. Best instruction-following + multilingual text;
  generates a consistent set of images with the same character/style. Commercial rights via OpenAI.
- **Recraft V4** — designer/brand-style + vector; excellent style consistency & control.
- **Adobe Firefly** — commercially safe, trained on licensed/PD content, offers IP indemnification
  (strong choice when SELLING the product).
- **Ideogram / FLUX** — good character consistency + text. **Midjourney** — best aesthetic but no official
  API and commercial caveats (avoid living-artist styles / trademarks).

## Export (production)
- 300 DPI, correct trim + bleed (square for 0-3, e.g. 8×8 in), RGB working / convert per KDP.
- Embed/outline any in-art type (rare); the fidel vocab is set at layout (see docs/fidel-rendering.md).

## Physical & safety realism (country-agnostic — the Illustration agent runs this as a checklist)
The art should be warm and friendly but still PHYSICALLY PLAUSIBLE — small realism slips (a lion right next to a
toddler over a knee-high rail) break the spell and read as unsafe. Apply these every scene:
- **Scale the barrier to the animal.** Big or potentially-dangerous animals (lion, leopard, hippo, bear, etc.)
  need a TALLER, sturdier barrier AND visible separation — the animal sits/stands **set BACK in its enclosure**
  (a clear gap, ledge, or moat between it and the child), never pressed against the rail beside the child.
  Gentle/small/tall-reaching animals (giraffe, rabbit, bird, monkey) can come closer to the rail.
- **Keep the child safely on the visitor side**, never within paw's reach of a predator. Distance = safety = calm.
- **Believable physics & proportions.** Right relative sizes (a lion dwarfs a toddler), things rest on the ground
  with gravity, water behaves like water, limbs/joints bend naturally, eye-lines actually meet.
- **Coherent setting.** Props, plants, architecture, and climate all belong to the active Country Pack's
  `environment_and_setting` — no out-of-place elements.
- **Friendly, never threatening.** Big animals stay soft-eyed and calm; show wonder/safety, not danger — solve it
  with body language and distance, not by shrinking a predator to toy size.
- **Friendly FACES are explicit, not implied.** "Not scary" alone is unreliable — state the expression:
  gentle smile, soft closed mouth (or a soft open "rawr" with NO bared/sharp teeth, NO fangs), warm relaxed eyes,
  ears up/neutral. Negatives to include for predators: no aggressive open jaws, no bared teeth, no snarl, no
  lunging. The CHILD can make the big sound/action; the animal stays calm and kind.
> Author/illustrator note: state the barrier height + the animal's setback explicitly in each prompt for big
> animals; don't assume the model will infer safe spacing.

## Cultural & formality guidance (country-agnostic — applies to every market)
- Represent the WHOLE nation inclusively across faiths, regions, and communities. Avoid placing
  faith-specific symbols on a recurring character's EVERYDAY clothing; reserve them for the matching
  holiday title. Use neutral, broadly-shared patterns for everyday wear.
- Match clothing formality to the scene: everyday scenes = everyday clothing; reserve formal/ceremonial
  dress for covers and holiday books. The native reviewer confirms cultural accuracy + sensitivity (Gate 1).
