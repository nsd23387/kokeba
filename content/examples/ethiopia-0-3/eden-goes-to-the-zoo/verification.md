# Verification — "Eden Goes to the Zoo" vs authoritative sources
Run by the Research agent against data-sources/registry.yaml. Sources are INPUTS; the native reviewer is final (Gate 1).
(Run live with: `node scripts/verify/verify-book.mjs ET am .../animals.verify.json`)

## Animal vocabulary (Amharic) — checked vs Wiktionary/Wikidata
| Animal | Book word | Authoritative | Status |
|---|---|---|---|
| lion | አንበሳ (anbessa) | አንበሳ | ✅ PASS |
| elephant | ዝሆን (zihon) | ዝሆን | ✅ PASS |
| monkey | ዝንጀሮ (zinjero) | ዝንጀሮ | ✅ PASS |
| giraffe | ቀጭኔ (qechne) | ቀጭኔ | ✅ PASS |
| camel | ግመል (gimel) | ግመል | ✅ PASS |
| hippo | ጉማሬ (gumare) | ጉማሬ / ጎማሬ (variant) | ⚠️ minor variant |
| leopard | ነብር (nebir) | ነብር / ነብሮ (variant); ነብር can also mean *tiger* | ❗ FLAG — reviewer must confirm |

## Native fauna — checked vs GBIF (presence in Ethiopia)
All 7 occur in Ethiopia (not just zoo imports):
- lion, leopard — Mago & Omo National Parks.
- elephant, hippo, **giraffe** (Nubian) — Gambella National Park; reticulated giraffe in the south.
- camel — widespread (Somali/Afar regions). monkey (grivet) — common.
Result: the animal selection is faunally authentic for Ethiopia.

## Verdict
6/7 vocabulary words clean; **leopard (ነብር)** must be confirmed (nebir vs nebro; risk of "tiger" meaning), and hippo spelling variant confirmed. Fauna 7/7 authentic. No content blockers — proceed to native review with these two items highlighted.

## Sources
- Amharic animal vocabulary: amharicteacher.com/animals · preply.com (animal names in Amharic) · polyglotclub Amharic animals
- Giraffe native to Ethiopia (Gambella NP): Giraffe Conservation Foundation — Nubian Giraffe Conservation in Ethiopia
- Fauna by park: Aardvark Safaris — Ethiopia's wildlife
