# Kokeba Studio — orchestrator, worker & console

Turns the manual book loop (generate → proof → review → regenerate) into a running platform
with human-in-the-loop controls and a chat feedback loop. Contract-first: stage execution is
**mocked** today; the real adapters are stubbed with the exact commands to drop in.

## Pieces (blueprint apps)
- **apps/api** — orchestrator + control plane. Pure-Node HTTP server, file-backed state
  (`apps/api/.data/state.json`). Owns books, the pipeline state machine, jobs, gates, controls,
  and chat. Serves the console at `/`.
- **apps/worker** — agent runtime. Polls `/api/next-job`, runs the stage adapter, posts completion.
  Scales horizontally (run more than one).
- **apps/web/src/console.html** — minimal operator console (served by the API): pipeline with
  Run/Approve buttons, live job feed, controls (approval mode, kill switch, budget), feedback chat.
- **packages/core/src/pipeline.mjs** — the canonical stages + gate rules.
- **packages/controls/src/control-plane.mjs** — kill switch, approval mode, budget caps.

## Pipeline
`research → author → character → illustration → layout → [Gate 1: native review] → compliance → [Gate 2: QA] → export`
Gate stages do no work — they sit at `needs_approval` until a human approves.

## Control plane
- **approval_mode** `copilot` (human runs each stage) | `autopilot` (engine auto-advances; gates still wait).
- **kill_switch** `on` pauses all dispatch.
- **budget** daily/monthly caps; per-stage cost is charged on completion and blocks when a cap would break.

## Run it
```bash
pnpm api        # http://localhost:8787  (API + console)
pnpm worker     # in a second terminal
# open http://localhost:8787
```
`POST /api/reset` reseeds the demo state.

## Chat → action
`POST /api/chat {bookId,text}` runs a mock interpreter (`interpretChat` in the API). "regenerate s05,
monkey too close" → enqueues a scoped `illustration` job with the note. **TODO:** replace the
interpreter with a real LLM call via `packages/agents`.

## Going live (swap mocks for real)
In `apps/worker/src/worker.mjs`, replace a stage adapter body with a `child_process` call to the
scripts we already built:
```js
import { execFileSync } from "node:child_process";
// illustration:
execFileSync("node", ["scripts/illustrate/generate-scenes.mjs", bookDir, ...(job.scope?["--only",job.scope,"--force"]:[])], {stdio:"inherit"});
// layout:
execFileSync("node", ["scripts/layout/build-book.mjs", bookDir]);
```
Then point books at their real `content/...` dir and the same UI drives real production.

## Next
- Replace file-store with Postgres (`apps/api`), add auth + license tiers (`packages/controls`).
- Build the full Next.js `apps/web` screens (Library, Wizard, Tracker, Review/Gates, Compliance, Publish, Packs).
- Wire the chat interpreter to a real model; stream the proof into the Review screen.
