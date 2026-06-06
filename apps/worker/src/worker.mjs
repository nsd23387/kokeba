#!/usr/bin/env node
// Kokeba worker — agent runtime. Polls the API for queued jobs and runs each stage.
// Contract-first: stages are MOCKED (simulated work + logs). The real adapters are
// stubbed below with the exact commands to drop in later.
//   node apps/worker/src/worker.mjs        (API_URL env, default http://localhost:8787)

const API = process.env.API_URL || "http://localhost:8787";
const POLL_MS = Number(process.env.POLL_MS || 1200);

const post = (p, body) => fetch(`${API}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- stage adapters ----------------------------------------------------------
// MOCK now. To go live, replace a stage body with a child_process call, e.g.:
//   import { execFileSync } from "node:child_process";
//   execFileSync("node", ["scripts/illustrate/generate-scenes.mjs", bookDir, "--only", job.scope, "--force"], {stdio:"inherit"});
//   execFileSync("node", ["scripts/layout/build-book.mjs", bookDir]);
const ADAPTERS = {
  research:     async () => ["fetched country + age data", "compiled author context"],
  author:       async () => ["composed manuscript", "AABB couplets, vocab not forced into rhyme"],
  character:    async () => ["locked Eden + Mama reference sheets (formal + everyday)"],
  illustration: async (job) => job.scope
    ? [`regenerated ${job.scope} with feedback`, job.note ? `note: ${job.note}` : "", "attached locked refs"].filter(Boolean)
    : ["generated cover + s01..s11", "attached locked refs", "applied safety + text-safe-zone rules"],
  layout:       async () => ["placed art + English + embedded fidel", "rebuilt proof.html"],
  compliance:   async () => ["COPPA/CPSIA checks", "BISAC + reading age set", "AI disclosure flagged"],
  export:       async () => ["rendered 300dpi PDF", "KDP trim + bleed verified"],
};

async function runOnce() {
  const { job } = await post("/api/next-job");
  if (!job) return false;
  console.log(`▶ ${job.stage}${job.scope ? ` (${job.scope})` : ""} [job ${job.id}]`);
  const adapter = ADAPTERS[job.stage] || (async () => ["(no adapter — noop)"]);
  await sleep(900 + Math.random() * 1200); // simulate work
  let logs;
  try { logs = await adapter(job); }
  catch (e) { logs = [`ERROR: ${e.message}`]; }
  await post(`/api/jobs/${job.id}/complete`, { logs });
  console.log(`✓ ${job.stage} done — ${logs.join("; ")}`);
  return true;
}

console.log(`Kokeba worker polling ${API} every ${POLL_MS}ms`);
while (true) {
  let did = false;
  try { did = await runOnce(); }
  catch (e) { console.error("poll error:", e.message); }
  if (!did) await sleep(POLL_MS);
}
