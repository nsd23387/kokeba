# Eden Goes to the Zoo — FINAL per-spread scene prompts (gpt-image-2)

## How to run
- Model **gpt-image-2**, square **1024×1024** (1:1), clean background, generate 2–3, pick best.
- **Attach `art/eden_ref.png`** to EVERY prompt. Scenes with Mommy (Cover, S2, S11) **also attach `art/mama_ref.png`**.
- **No text/letters in any image** — the English (left page) and fidel vocab (right page) are added at layout.
- Save outputs in `art/` as: `cover.png`, `s01.png` … `s11.png`.
- Keep the same model + a fixed style seed across all scenes for consistency.

## Shared block (already implied by the attachments; included for clarity)
Soft, warm children's storybook illustration — gentle painterly shading, subtle texture, rounded friendly
shapes, cozy warm lighting. Palette: cream/white, sage-green, gold, navy accents. Characters EXACTLY as in the
attached reference sheet(s): **Eden** (toddler, warm brown skin, natural dark-brown curly hair + small gold star
clip, everyday cream habesha-inspired dress with a NEUTRAL sage-green/gold geometric tibeb border, baby
proportions) and, where attached, **Mama** (warm Ethiopian woman, curly hair + light netela, matching family
palette). Ages 0–3: one clear subject, generous clean background, NO text in the image, square composition.
Cultural rule: inclusive of all Ethiopian kids (incl. Muslim) — neutral geometric tibeb on everyday wear, no
faith-specific symbols on everyday outfits; everyday (not formal) dress for this casual zoo trip.

---

## Prompts (paste one at a time)

**COVER**  · attach `eden_ref.png` + `mama_ref.png` · save `cover.png`
> [shared block] Scene: Eden stands at a bright, colorful zoo entrance gate holding Mama's hand and looking up
> with wide-eyed wonder; a few friendly animals (a lion, a giraffe) peek playfully over the gate. Warm and
> inviting. Leave calm, uncluttered space across the top third for a title (but render NO text).

**S1 — wake** · attach `eden_ref.png` · save `s01.png`
> [shared block] Scene: Eden waking up in a cozy little bed, stretching her arms with a sleepy happy smile;
> soft golden morning light through a window; a small toy nearby. Calm and warm.

**S2 — journey** · attach `eden_ref.png` + `mama_ref.png` · save `s02.png`
> [shared block] Scene: Eden holding Mama's hand, walking happily toward the colorful zoo gate, pointing ahead
> with excitement. Mama is warm and gentle, kept secondary. A clear, simple path.

**S3 — lion (Anbessa)** · attach `eden_ref.png` · save `s03.png`
> [shared block] Scene: a big, friendly lion with a soft fluffy mane, gently roaring (mouth open, kind eyes —
> not scary); little Eden in the lower corner cupping her hands to "roar" back, delighted. Lion is the large hero.

**S4 — elephant (Zihon)** · attach `eden_ref.png` · save `s04.png`
> [shared block] Scene: a happy, round elephant lifting its trunk high as if waving "good day"; Eden waving back
> with a big smile.

**S5 — monkey (Zinjero)** · attach `eden_ref.png` · save `s05.png`
> [shared block] Scene: a playful little monkey swinging from a leafy branch, chattering cheerfully; Eden giggling
> below with her hands up, "chattering" along.

**S6 — giraffe (Qechne)** · attach `eden_ref.png` · save `s06.png`
> [shared block] Scene: a tall, gentle giraffe bending its long neck down toward Eden, who stretches up on
> tiptoes with a delighted smile to reach it. Sweet and warm.

**S7 — camel (Gimel)** · attach `eden_ref.png` · save `s07.png`
> [shared block] Scene: a calm, smiling one-humped camel; Eden beside it bouncing and wiggling happily, mid-giggle.

**S8 — hippo (Gumare)** · attach `eden_ref.png` · save `s08.png`
> [shared block] Scene: a round, jolly hippo splashing in a little pool with cheerful water droplets; Eden
> laughing and pretending to splash, hands out.

**S9 — leopard (Nebir)** · attach `eden_ref.png` · save `s09.png`
> [shared block] Scene: a gentle spotted leopard tiptoeing softly through leafy grass (friendly, calm — not
> fierce); Eden tiptoeing quietly beside it, a finger to her lips, eyes wide with delight.

**S10 — reflection** · attach `eden_ref.png` · save `s10.png`
> [shared block] Scene: Eden smiling and waving goodbye to all the animals as she leaves; the lion, elephant,
> giraffe and friends wave back warmly in the soft background. Happy and content.

**S11 — final / bus** · attach `eden_ref.png` + `mama_ref.png` · save `s11.png`
> [shared block] Scene: Eden sitting beside Mama on a cozy bus seat, looking up at her with a sleepy, happy
> smile; through the window the zoo and a soft evening sky fade into the distance, with a few first stars
> beginning to twinkle. Tender, calm, bedtime-warm.

---

## After generating
Place each scene on the RIGHT page in layout; add the English (left) + the fidel vocab word (right) with the
embedded Ethiopic font (see `docs/fidel-rendering.md`). Then assemble the proof and do the single COLLECTIVE
native-speaker review (Gate 1).
