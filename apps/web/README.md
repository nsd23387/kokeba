# @kokeba/web — Operator UI (Next.js)

Next.js 14 (App Router) + Tailwind, Kokeba brand palette. Talks to `@kokeba/api`.

## Screens
- **Review & Gates** — `/review/[bookId]` — the proof **streams in spread-by-spread** (SSE), with the
  Gate 1 native-review panel: per-word Amharic confirm/correct, the two priority flags
  (leopard ነብር, hippo ጉማሬ), cultural sign-off, and **Approve Gate 1 / Return for changes** wired to the
  orchestrator. Approving advances the pipeline to compliance; returning reopens illustration + layout.
- (Planned) Library/Dashboard, New-Title wizard, Production tracker, Compliance, Publish, Packs, Controls.

## Run
```bash
# 1) start the orchestrator + worker (repo root)
pnpm api          # http://localhost:8787
pnpm worker

# 2) start the web app
cd apps/web && npm install && npm run dev   # http://localhost:3000  -> redirects to the Eden review
```
Point at a different API with `NEXT_PUBLIC_API_URL`. The proof images are served by the API from the
book's `content/.../art/` folder, so no asset copying is needed.

## How the proof streams
The page opens an `EventSource` to `GET /api/books/:id/proof-stream`; the API emits one page every ~420ms
(`meta` -> `page` x N -> `done`). Each spread fades in with a shimmer skeleton until its art loads.
