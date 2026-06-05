# Kokeba 📖
**The country-agnostic AI-agent platform for children's books.**
_A story for every little star._

One reusable engine produces children's books for any market. Configure it with a
**Country Pack** (language, characters, culture, marketplace) and an **Age-Range Pack**
(industry-standard age band), and a team of AI agents writes, illustrates, lays out,
compliance-checks, and prepares each title for Amazon KDP — with humans reviewing
language/culture and doing the final upload.

> **First release:** Ethiopia · ages 0–3 (board books).

## Quickstart
```bash
pnpm install
cp .env.example .env        # fill in keys (documented inline)
make dev                    # boots api + worker + web locally
make book COUNTRY=ethiopia AGE=0-3 CONCEPT="first-words"
pnpm new:country --from packs/country-packs/_template --name kenya
```

## What's here
| Path | What it is |
|---|---|
| `apps/` | Deployable apps: `web` (operator UI), `api` (orchestrator + control plane), `worker` (agent runtime) |
| `packages/` | The engine: core, agents runtime, packs, compliance, kdp, integrations, controls, ui, types |
| `agents/` | Human-readable agent specs (the core IP) with evals |
| `packs/` | Swappable content: Country Packs + Age-Range Packs |
| `compliance/` | The auditable rulebook (KDP, AI disclosure, COPPA, CPSIA, BISAC) |
| `docs/` | Product + technical docs |
| `commercial/` | EULA, pricing, white-label, demo — the sales kit |

See `docs/architecture/` for the full data-flow diagram and `commercial/PRICING.md` for licensing tiers.

© Kokeba. Licensed under the EULA in `LICENSE`. Working name — confirm trademark before launch.
