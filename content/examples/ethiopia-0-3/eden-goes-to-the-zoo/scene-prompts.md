# Eden Goes to the Zoo — FINAL per-spread scene prompts (gpt-image-2)

## How to run
- Model **gpt-image-2**, square **1024×1024** (1:1), generate 2–3, pick best.
- **This is a casual outing, so attach the EVERYDAY wardrobe refs** (generate them once via
  `characters/eden.everyday-refsheet-prompt.md` + `mama.everyday-refsheet-prompt.md`). Attach
  **`art/eden_everyday_ref.png`** to EVERY prompt; **Mama is with Eden the whole trip**, so **also attach
  `art/mama_everyday_ref.png`** to every scene EXCEPT S1 (home, Eden waking alone).
  *(Reason: the reference image dictates the outfit — a formal-dress ref forces formal dress. Use the casual ref
  for casual scenes; reserve the formal `*_ref.png` for covers/holiday titles.)*
- **No text/letters in any image** — the English (left page) and fidel vocab (right page) are added at layout.
- Save outputs in `art/` as: `cover.png`, `s01.png` … `s11.png`.
- Keep the same model + a fixed style seed across all scenes for consistency.

## ZOO SETTING (important) — this is an ETHIOPIAN highland zoo
This is a trip to the **zoo**, so each animal is INSIDE a simple, friendly zoo enclosure — Eden and Mama view it
from the **visitor side**. Use a **low rounded wooden rail/fence** in the foreground between them and the animal,
and a soft natural habitat behind the animal (grass, a rock or tree, maybe a little pool). Optionally a small
BLANK wooden sign post by the rail (no text). Keep it soft and uncluttered (one clear animal subject); don't make
it busy.

**Make the place read as ETHIOPIA, not a generic zoo** (from the Country Pack `environment_and_setting`):
- **Setting:** the Addis Ababa highlands (~2,355 m) — **temperate, sunny, clear blue sky**, soft warm high-altitude
  light, reddish-brown soil with tended green grass/shrubs. NOT hot tropical, NO snow/pine, NO Western zoo buildings.
- **Trees behind the enclosures:** tall slender **eucalyptus** (blue-green, peeling bark), a **flat-topped acacia**,
  and a big spreading **warka (sycamore fig) shade tree**. A few yellow **adey abeba** (Meskel daisies) are a nice touch.
- Keep all of this SOFT and in the background — one clear friendly animal stays the subject.

**Barrier realism (scale the fence to the animal — keep it believable & safe):**
- **Big/strong animals — lion (S3), leopard (S9), hippo (S8):** set the animal **BACK** in its enclosure on a
  raised rocky ledge with a **clear gap (a moat or planted strip)** and a **taller, sturdy rail or low stone wall**
  between it and Eden. The lion is NOT right next to her over a knee-high rail — distance reads as safe and calm.
- **Gentle / tall-reaching animals — giraffe (S6), elephant trunk (S4), monkey (S5), camel (S7):** can come nearer
  the rail; a low rounded rail is fine.
- Eden + Mama always stay safely on the **visitor side**. Big animals stay soft-eyed and friendly (never scary).

## MAMA in every zoo scene
Eden is the HERO of each page (do the action, biggest/closest). **Mama (Emaye) stands warmly beside or just
behind her** as the secondary figure — holding her hand, a hand on her shoulder, or crouching to her level and
sharing the moment. Keep Mama smaller/softer in focus so Eden stays the subject. Mama is NOT in S1 (Eden wakes
alone at home).

## Shared block (prepend / implied by attachments)
Soft, warm children's storybook illustration — gentle painterly shading, subtle texture, rounded friendly
shapes, cozy warm lighting. Palette: cream/white, sage-green, gold, navy accents. Ages 0–3: NO text in the image,
square composition, soft background.

**IDENTITY (from attachments) — keep EXACT:** **Eden** (toddler, warm brown skin, natural dark-brown curly hair
+ small **gold star clip**, big friendly eyes, baby proportions) and, where attached, **Mama** (her mother, warm
brown skin, dark curly shoulder-length hair). Keep their faces, hair, and the star clip identical to the
references.

**WARDROBE — keep the EVERYDAY casual outfits shown in the attached refs** (this is a casual zoo outing): Eden in
a simple comfy short-sleeve play dress (warm color, small geometric trim, comfy shoes, gold star clip); Mama in
modern everyday clothes (top + skirt/trousers or casual dress, warm family tones, **no netela**). If the model
drifts toward formal/ceremonial white habesha, correct it — everyday only.

Cultural rule: inclusive of all Ethiopian kids (incl. Muslim) — neutral geometric patterns only, no faith-specific
symbols on everyday wear.

---

## Prompts (paste one at a time)

**COVER** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `cover.png`
> [shared block] Scene: Eden stands at a bright, colorful **zoo entrance gate** holding Mama's hand and looking
> up with wide-eyed wonder; a few friendly animals (a lion, a giraffe) peek playfully over the gate/enclosures.
> Leave calm space across the top third for a title (render NO text).

**S1 — wake** · attach `eden_everyday_ref.png` · save `s01.png`
> [shared block] Scene: Eden waking in a cozy little bed, stretching with a sleepy happy smile; soft golden
> morning light through a window. (No zoo yet — this is home.)

**S2 — journey** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s02.png`
> [shared block] Scene: Eden holding Mama's hand, walking happily toward the **zoo entrance gate**, pointing
> ahead with excitement. Mama warm and secondary.

**S3 — lion (Anbessa)** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s03.png`
> [shared block] ZOO SCENE: a big, friendly **Ethiopian "black-maned" Abyssinian lion** — a soft, fluffy but
> noticeably **DARK mane** running from the head over the shoulders (this is the real Addis "Anbessa Gibi" lion;
> keep it gentle and friendly for 0–3). **BARRIER REALISM:** the lion sits **set BACK** on a raised rocky ledge
> deeper in its highland enclosure, with a **clear gap (a small moat / planted strip)** and a **taller, sturdy
> wooden rail or low stone wall** between it and Eden — it is NOT right beside her. Habitat behind: reddish soil
> and grass, eucalyptus + a warka shade tree, blue sky. Eden stands at the barrier on the **visitor side**, cupping
> her hands to "roar" back, delighted; **Mama beside her, a hand on her shoulder, smiling**. Lion soft-eyed and
> friendly (not scary). A small blank sign post by the rail.

**S4 — elephant (Zihon)** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s04.png`
> [shared block] ZOO SCENE: a happy round elephant in its enclosure (dirt-and-grass habitat with a little pool)
> behind a low rail, lifting its trunk to wave; Eden at the rail waving back with a big smile, **Mama beside her
> waving too**.

**S5 — monkey (Zinjero)** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s05.png`
> [shared block] ZOO SCENE: a playful monkey swinging on a branch / climbing frame inside a leafy enclosure
> behind a low rail; Eden at the rail giggling with her hands up, "chattering" along; **Mama crouched beside her,
> laughing with her**.

**S6 — giraffe (Qechne)** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s06.png`
> [shared block] ZOO SCENE: a tall gentle giraffe in its enclosure bending its long neck down over a low rail
> toward Eden, who looks up and stretches on tiptoes with a delighted smile; **Mama beside her, gently steadying
> her, looking up too**.

**S7 — camel (Gimel)** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s07.png`
> [shared block] ZOO SCENE: a calm smiling one-humped camel in a sandy enclosure behind a low rail; Eden at the
> rail bouncing and wiggling happily, mid-giggle; **Mama beside her, holding her hand and smiling**.

**S8 — hippo (Gumare)** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s08.png`
> [shared block] ZOO SCENE: a round jolly hippo splashing in its **pool set back** inside the enclosure (a clear
> gap + a sturdy rail between the pool and the path), cheerful water droplets; Eden at the rail laughing and
> pretending to splash; **Mama beside her, sharing the laugh**.

**S9 — leopard (Nebir)** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s09.png`
> [shared block] ZOO SCENE: a gentle spotted leopard tiptoeing softly **set BACK** on the rocks deeper in its
> leafy enclosure (a clear gap + a taller sturdy rail between it and the path; calm, friendly, not fierce); Eden
> at the barrier tiptoeing quietly, finger to her lips, eyes wide; **Mama beside her, also tiptoeing playfully,
> finger to lips**.

**S10 — reflection** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s10.png`
> [shared block] ZOO SCENE: Eden walking down the zoo path **holding Mama's hand**, both waving goodbye; the lion,
> elephant and giraffe wave back warmly from their enclosures in the soft background. Happy and content.

**S11 — final / bus** · attach `eden_everyday_ref.png` + `mama_everyday_ref.png` · save `s11.png`
> [shared block] Scene: Eden sitting beside Mama on a cozy bus seat, looking up at her with a sleepy happy smile;
> through the window the zoo and a soft evening sky fade away, a few first stars twinkling. Tender, bedtime-warm.
> (No enclosure — they're heading home.)

---

## After generating
Place each scene on the RIGHT page in layout; add the English (left) + the fidel vocab (right) with the
embedded Ethiopic font (see `docs/fidel-rendering.md`). Then assemble the proof and do the single COLLECTIVE
native-speaker review (Gate 1).
