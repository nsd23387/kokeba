// Kokeba pipeline definition (shared by api + worker). Country-agnostic.
// The orchestrator advances a title through these stages; gate stages need a human.

export const STAGES = [
  { id: "research",     label: "Market research",        agent: "market-intelligence", cost: 0 },
  { id: "author",       label: "Author story",           agent: "author",              cost: 1 },
  { id: "character",    label: "Character design",        agent: "character-designer",  cost: 2 },
  { id: "illustration", label: "Illustration",            agent: "illustration",        cost: 6 },
  { id: "layout",       label: "Layout & proof",          agent: "layout",              cost: 1 },
  { id: "upscale",      label: "Upscale to print res",    agent: "layout",              cost: 0 },
  { id: "gate1",        label: "Gate 1 — native review",  agent: "human", gate: true,   cost: 0 },
  { id: "compliance",   label: "Compliance pre-flight",   agent: "compliance",          cost: 0 },
  { id: "gate2",        label: "Gate 2 — QA sign-off",    agent: "human", gate: true,   cost: 0 },
  { id: "export",       label: "Export to KDP",           agent: "layout",              cost: 1 },
];

export const STAGE_IDS = STAGES.map((s) => s.id);
export const stage = (id) => STAGES.find((s) => s.id === id);
export const nextStageId = (id) => {
  const i = STAGE_IDS.indexOf(id);
  return i >= 0 && i < STAGE_IDS.length - 1 ? STAGE_IDS[i + 1] : null;
};
export const isGate = (id) => Boolean(stage(id)?.gate);

// Per-stage status values used in book.stages[stageId]
export const STATUS = {
  PENDING: "pending",          // not started
  QUEUED: "queued",            // job enqueued, waiting for a worker
  RUNNING: "running",          // worker is processing
  NEEDS_APPROVAL: "needs_approval", // gate awaiting human
  DONE: "done",
  BLOCKED: "blocked",          // kill switch / budget / failure
};

// A fresh per-book stage map.
export function freshStages() {
  const m = {};
  for (const s of STAGES) m[s.id] = STATUS.PENDING;
  return m;
}
