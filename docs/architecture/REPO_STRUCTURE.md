# Kokeba — Repository Structure & Packaging Proposal

> A product-grade GitHub layout for **Kokeba**, the country-agnostic AI-agent platform for children's books. This structure is designed so that a buyer, partner, or new engineer can open the repo and understand the whole product in minutes — and so the codebase can be sold, licensed, or white-labelled cleanly.

---

## 1. Design principles

The layout is built around five ideas, each mapped directly to the platform architecture.

| Principle | What it means in the repo | Why it matters for selling |
|---|---|---|
| **Engine vs. content separation** | The reusable *engine* (`apps/`, `packages/`, `agents/`) is strictly separated from swappable *content* (`packs/`). | A buyer licenses one engine and gets unlimited markets by adding packs — the core value proposition is visible in the folder tree. |
| **Controls-first** | Guardrails, compliance rules, and the kill switch live in dedicated, auditable packages (`packages/controls`, `packages/compliance`, `compliance/`). | Buyers (and their lawyers) can audit safety and compliance without reading application code. |
| **Configuration as data** | Country Packs and Age-Range Packs are versioned YAML/asset bundles, not code. | Non-engineers can extend the product; packs can be sold separately as add-ons. |
| **Monorepo, clearly bounded** | One repo, many independently-versioned packages via pnpm + Turborepo. | Easy to demo end-to-end, easy to carve into tiers (engine-only, UI add-on, marketing add-on). |
| **Sellable from day one** | First-class `docs/`, `commercial/`, `examples/`, and clean license hygiene. | The repo *is* the product collateral — quickstart, EULA, pricing, white-label guide all included. |

---

## 2. Top-level tree

```text
kokeba/
├── README.md                      # The 5-minute pitch + quickstart (sells the repo)
├── LICENSE                        # Commercial EULA (proprietary) — see commercial/
├── LICENSES/                      # Third-party license notices (compliance)
├── CHANGELOG.md                   # Keep-a-Changelog format, semver
├── SECURITY.md                    # Vuln disclosure + supported versions
├── SUPPORT.md                     # How licensees get help / SLAs
├── CONTRIBUTING.md                # For licensed dev access
├── CODE_OF_CONDUCT.md
├── .env.example                   # Every required secret, documented, no values
├── .gitignore  .editorconfig  .nvmrc
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json                     # Turborepo task graph (build/test/lint/e2e)
├── tsconfig.base.json
├── Makefile                       # One-command dev: make dev / make book / make ship
│
├── .github/                       # Automation & governance
│   ├── workflows/                 # ci.yml · release.yml · security-scan.yml · e2e.yml
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
│
├── apps/                          # Deployable applications (the running platform)
│   ├── web/                       # Kokeba front-end UI (Next.js) — the §5.7 screens
│   ├── api/                       # Orchestrator API + Control Plane (auth, jobs, gates)
│   └── worker/                    # Agent runtime — executes pipeline jobs/queues
│
├── packages/                      # Shared, versioned libraries (the engine)
│   ├── core/                      # Orchestrator, pipeline state machine, job queue
│   ├── agents/                    # Agent runtime contracts (loads /agents specs)
│   ├── packs/                     # Country/Age-Range Pack schema, loader, validator
│   ├── compliance/                # Rules engine (executes /compliance rulebook)
│   ├── kdp/                       # Manuscript → print/Kindle export, metadata, checklist
│   ├── integrations/              # Canva · image-gen · KDP-research · MCP clients
│   ├── controls/                  # Budget caps · approval gates · kill switch · logging
│   ├── ui/                        # Shared React component library / design system
│   ├── config/                    # Shared eslint / tsconfig / tailwind presets
│   └── types/                     # Shared TS types + zod schemas (single source of truth)
│
├── agents/                        # Agent SOURCE specs (human-readable, core IP)
│   ├── orchestrator/
│   ├── market-intelligence/
│   ├── author/
│   ├── illustration/
│   ├── layout/
│   ├── compliance/
│   └── marketing/                 # research · creative · ads · social · email · reviews · analytics
│
├── packs/                         # CONTENT you swap to launch a market/age band (DATA, not code)
│   ├── country-packs/
│   │   ├── _template/             # Blank Country Pack — copy to add a market
│   │   └── ethiopia/              # First market (the first Country Pack)
│   └── age-range-packs/
│       ├── _template/
│       ├── 0-3-board-book.yaml    # Launch band
│       ├── 3-6-picture-book.yaml
│       └── 6-9-chapter-book.yaml
│
├── compliance/                    # The RULEBOOK as auditable data (not buried in code)
│   ├── rules/                     # kdp · ai-disclosure · coppa · cpsia · bisac · trademark
│   └── checklists/                # Per-stage pass/fail checklists
│
├── content/                       # Generated book projects (gitignored output + curated examples)
│   └── examples/
│
├── infra/                         # Deployment
│   ├── docker/                    # Dockerfiles + docker-compose for local stack
│   ├── terraform/                 # Cloud infra as code
│   └── k8s/                       # Optional Helm/manifests
│
├── docs/                          # Product + technical documentation (sellable)
│   ├── product/                   # Overview, screens, quickstart, onboarding
│   ├── architecture/              # Diagram, ADRs, data-flow (the blueprint lives here)
│   ├── api/                       # OpenAPI reference
│   ├── guides/                    # add-a-country · add-an-age-band · run-a-book · publish-to-kdp
│   ├── compliance/                # Legal notes, disclosures, audit trail
│   └── operations/                # Runbooks, controls, kill-switch procedure
│
├── examples/                      # Runnable examples + sample packs
├── scripts/                       # Dev/ops scripts (seed, migrate, new-country, new-book)
├── tests/                         # Cross-package e2e + shared fixtures
│
└── commercial/                    # SALES & LICENSING MATERIALS (because you're selling it)
    ├── EULA.md                    # End-user license agreement
    ├── PRICING.md                 # Packaging tiers (see §6)
    ├── white-label/               # Rebranding + theming guide
    ├── onboarding/                # Buyer setup, license-key provisioning
    └── demo/                      # Demo script + sample data for sales calls
```

---

## 3. How the repo maps to the architecture

Every box in the Kokeba architecture diagram has a home in the tree. A buyer can trace the product they saw in the demo straight to the code.

| Architecture element | Lives in |
|---|---|
| Orchestrator (Claude) | `packages/core` + `agents/orchestrator` |
| Market-Intelligence agent ("what sells fast") | `agents/market-intelligence` + `packages/integrations` (KDP-research clients) |
| Author / Illustration / Layout / Assembly agents | `agents/*` + `packages/agents` (runtime) |
| **Compliance agent** (pre-flight) | `agents/compliance` + `packages/compliance` + `compliance/rules` |
| Marketing agent team | `agents/marketing/*` |
| Country Pack / Age-Range Pack | `packs/` (data) + `packages/packs` (schema/loader) |
| Human gates + KDP upload | `apps/web` (Review & Gates screens) + `packages/kdp` |
| Control Plane (caps, gates, kill switch) | `packages/controls` + `apps/api` |
| Tracking datastore | `apps/api` (DB) + `packages/types` |
| Front-end UI (§5.7 screens) | `apps/web` + `packages/ui` |
| YouTube / expansion | `packages/integrations` (kept modular for a future `apps/studio`) |

---

## 4. Deep-dive on the key directories

### 4.1 `agents/` — the core IP, kept human-readable
Each agent is a self-contained folder so it can be reviewed, evaluated, and sold as a unit.

```text
agents/author/
├── agent.md            # The prompt / system spec (the actual "thinking")
├── tools.ts            # Tools this agent may call (typed)
├── io.schema.ts        # Input/output contract (zod) — what it consumes/produces
├── evals/              # Golden tests: prompts in, expected qualities out
│   ├── cases/
│   └── rubric.md
└── README.md           # What it does, guardrails, owner
```

This mirrors the Claude Agent SDK / Claude Code subagent model, so the platform stays portable: `.claude/agents/` and `.claude/skills/` can symlink or generate from here.

### 4.2 `packs/` — content you swap (the multiplier)
A Country Pack is everything that makes a market local; an Age-Range Pack is everything industry-standard about a band.

```text
packs/country-packs/ethiopia/
├── country.yaml        # language(s), script, marketplace, gifting calendar, reviewer
├── characters/         # character bible (Abeba & goat): looks, names, personalities
├── culture/            # holidays, food, animals, landmarks, folktales, faith (vetted)
├── keywords.yaml       # market keywords / categories (filled by Market-Intelligence)
└── brand-kit/          # palette, fonts (Noto Sans Ethiopic), logo, cover styles

packs/age-range-packs/0-3-board-book.yaml
# BISAC band, word-count range, page count, format, CPSIA flags, design rules
```

> **Selling angle:** packs are sellable SKUs. The engine is the platform license; each additional Country Pack or Age-Range Pack can be an add-on.

### 4.3 `compliance/` — the rulebook as data
The Compliance agent executes rules that live here as auditable YAML, not hidden in code — so a buyer's legal team can review them directly.

```text
compliance/rules/
├── kdp.yaml            # KDP content policy checks
├── ai-disclosure.yaml  # When/what to declare at upload
├── coppa.yaml          # Adults-only targeting, no kids' data
├── cpsia.yaml          # 0–3 / novelty testing + tracking-label triggers
├── bisac.yaml          # Reading-age + category eligibility
└── trademark.yaml      # Name/IP conflict checks
```

### 4.4 `apps/` — three deployables, clean boundaries
- **web** — the operator UI (Library, New Title wizard, Production tracker, Review & Gates, Compliance panel, Publish, Analytics, Packs Manager, Controls).
- **api** — orchestrator + Control Plane: auth, job orchestration, approval gates, budget enforcement, logging, the kill switch.
- **worker** — runs agent jobs from the queue (scales horizontally; the heavy lifting).

### 4.5 `content/` — generated output, isolated
Generated books never pollute the engine. Real runs are gitignored; a few curated, redistributable examples live in `content/examples/` for demos.

---

## 5. Tech stack & conventions (assumptions — swap freely)

| Concern | Choice | Notes |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Fast, cache-friendly, tier-friendly |
| Language | **TypeScript** (engine/UI) + **Python** (select agent tooling/market scripts) | Polyglot under one roof via `scripts/` and `packages/integrations` |
| Front-end | **Next.js + React + Tailwind**, shared `packages/ui` | The §5.7 screens |
| Agents | **Claude Agent SDK / Claude Code** | `agents/*` specs are portable |
| Validation | **zod** schemas in `packages/types` | One source of truth for packs + IO |
| Data | Postgres (catalog/tracker), object storage (assets) | Behind `apps/api` |
| CI/CD | GitHub Actions in `.github/workflows` | build · test · e2e · security-scan · release |
| Versioning | **Semver + Changesets**, Keep-a-Changelog | Clean releases for licensees |
| Quality | ESLint + Prettier + typecheck + agent **evals/** | Gates in CI |

**Conventions:** Conventional Commits, trunk-based with short-lived branches, every package has its own `README.md` + `CHANGELOG.md`, every agent has `evals/`, nothing public-facing ships without passing the Compliance rulebook.

---

## 6. Packaging & licensing for sale

Because the value is "one engine, many markets," the repo is structured to be sold in tiers without re-architecting.

| Tier | What's included (folders) | Pitch |
|---|---|---|
| **Engine License** | `apps/api` · `apps/worker` · `packages/*` · `agents/*` · `compliance/` | The platform + agents. Bring your own packs. |
| **Studio (UI) add-on** | `apps/web` · `packages/ui` | The full operator front-end (§5.7). |
| **Country Pack** (per market) | one `packs/country-packs/<market>` | Launch a new country. Sold individually. |
| **Age-Range Pack** (per band) | one `packs/age-range-packs/<band>` | Add a new age band (0–3, 3–6, 6–9…). |
| **Marketing add-on** | `agents/marketing/*` | The growth/ads agent team. |
| **White-label** | `commercial/white-label` + theming in `packages/ui` | Rebrand and resell. |

`commercial/` carries the EULA, pricing, onboarding, white-label guide, and a demo kit — so the repo doubles as the sales package. License keys / entitlement gating belong in `apps/api`; what each tier unlocks is configuration, not a fork.

> **Licensing hygiene:** root `LICENSE` is the proprietary EULA; `LICENSES/` holds third-party notices; `SECURITY.md`/`SUPPORT.md` set buyer expectations. Keep AI-model and asset-generation terms documented in `docs/compliance` (important when reselling AI-made content).

---

## 7. Getting started (what a buyer runs first)

```bash
pnpm install                 # install the workspace
cp .env.example .env         # fill in keys (documented inline)
make dev                     # boots api + worker + web locally (docker-compose)

# Produce the first book end-to-end (Ethiopia, ages 0–3):
make book COUNTRY=ethiopia AGE=0-3 CONCEPT="first-words"

# Add a new market: copy the template, fill it, you're live:
pnpm new:country --from packs/country-packs/_template --name kenya
```

The README leads with this exact flow — a buyer sees a finished book from one command, then sees that a new country is a `pnpm new:country` away. That demo *is* the sales pitch.

---

## 8. Why this reads as a finished product

1. **Open the README → understand the business** in 5 minutes (engine + packs + tiers).
2. **Open the tree → trace the architecture** one-to-one (§3).
3. **Open `agents/` → see the IP** in clean, reviewable specs with evals.
4. **Open `compliance/` → audit the guardrails** without reading app code.
5. **Open `commercial/` → it's already a sales kit** (EULA, pricing, white-label, demo).
6. **Run one command → see a finished book**, then a new country in one more.

That is what "exceptionally organized for consumption" looks like for a codebase you intend to sell.
