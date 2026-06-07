#!/usr/bin/env node
// Kokeba worker — agent runtime. Polls the API for queued jobs and runs each stage.
// Contract-first: stages are MOCKED (simulated work + logs). The real adapters are
// stubbed below with the exact commands to drop in later.
//   node apps/worker/src/worker.mjs        (API_URL env, default http://localhost:8787)

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.API_URL || "http://localhost:8787";
const POLL_MS = Number(process.env.POLL_MS || 1200);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MOCK = process.env.MOCK_STAGES === "1"; // set to mock the illustration stage too

const post = (p, body) => fetch(`${API}${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then((r) => r.json());
const get = (p) => fetch(`${API}${p}`).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// LIVE illustration: run the real generator for the scene(s), inject reviewer feedback,
// then rebuild the proof so the UI shows the new art. Needs IMAGE_GEN_API_KEY in .env.
async function runIllustrationLive(job) {
  const book = await get(`/api/books/${job.bookId}`).then((r) => r.book);
  if (!book?.dir) throw new Error("book has no content dir");
  const gen = ["scripts/illustrate/generate-scenes.mjs", book.dir, "--force"];
  if (job.scope) gen.push("--only", job.scope);
  if (job.note) gen.push("--note", job.note);
  execFileSync("node", gen, { cwd: REPO_ROOT, stdio: "inherit", env: process.env });
  execFileSync("node", ["scripts/layout/build-book.mjs", book.dir], { cwd: REPO_ROOT, stdio: "inherit", env: process.env });
  await runPreflight(job.bookId, book.dir);
  await runVisionQA(job.bookId, book.dir);
  return [job.scope ? `regenerated ${job.scope}` : "generated all scenes", job.note ? `feedback: ${job.note}` : "", "rebuilt proof + QA"].filter(Boolean);
}

// Run the deterministic pre-flight QA and store results so the UI shows flags before Gate 1.
async function runPreflight(bookId, dir) {
  let out;
  try { out = execFileSync("node", ["scripts/preflight/check-book.mjs", dir, "--json"], { cwd: REPO_ROOT }).toString(); }
  catch (e) { out = e.stdout ? e.stdout.toString() : '{"ok":false,"counts":{"fail":-1,"warn":0,"pass":0},"flags":[]}'; }
  try { await post(`/api/books/${bookId}/preflight`, JSON.parse(out)); } catch {}
}

// Vision QA — opt-in (VISION_QA=1) pixel-level inspection via a vision model.
async function runVisionQA(bookId, dir) {
  if (process.env.VISION_QA !== "1") return;
  let out;
  try { out = execFileSync("node", ["scripts/preflight/vision-check.mjs", dir, "--json"], { cwd: REPO_ROOT, env: process.env, maxBuffer: 10 * 1024 * 1024 }).toString(); }
  catch (e) { out = e.stdout ? e.stdout.toString() : '{"ok":false,"counts":{"fail":-1,"warn":0,"pass":0},"flags":[]}'; }
  try { await post(`/api/books/${bookId}/vision`, JSON.parse(out)); } catch {}
}

// --- stage adapters ----------------------------------------------------------
// MOCK now. To go live, replace a stage body with a child_process call, e.g.:
//   import { execFileSync } from "node:child_process";
//   execFileSync("node", ["scripts/illustrate/generate-scenes.mjs", bookDir, "--only", job.scope, "--force"], {stdio:"inherit"});
//   execFileSync("node", ["scripts/layout/build-book.mjs", bookDir]);
const ADAPTERS = {
  research:     async () => ["fetched country + age data", "compiled author context"],
  author:       async () => ["composed manuscript", "AABB couplets, vocab not forced into rhyme"],
  character:    async () => ["locked Eden + Mama reference sheets (formal + everyday)"],
  illustration: async (job) => MOCK
    ? [`(mock) regenerated ${job.scope || "all"}`, job.note ? `note: ${job.note}` : ""].filter(Boolean)
    : runIllustrationLive(job),
  upscale:      async (job) => {
    const book = await get(`/api/books/${job.bookId}`).then((r) => r.book);
    if (book?.dir) {
      execFileSync("node", ["scripts/upscale/upscale-art.mjs", book.dir], { cwd: REPO_ROOT, stdio: "inherit", env: process.env, maxBuffer: 16 * 1024 * 1024 });
      execFileSync("node", ["scripts/layout/build-book.mjs", book.dir], { cwd: REPO_ROOT, stdio: "inherit" });
    }
    return ["upscaled art to print resolution (>=300 DPI)", "rebuilt proof"];
  },
  layout:       async (job) => {
    const book = await get(`/api/books/${job.bookId}`).then((r) => r.book);
    if (book?.dir) {
      execFileSync("node", ["scripts/layout/build-book.mjs", book.dir], { cwd: REPO_ROOT, stdio: "inherit" });
      await runPreflight(job.bookId, book.dir);
      await runVisionQA(job.bookId, book.dir);
    }
    return ["placed art + English + embedded fidel", "rebuilt proof.html", "ran pre-flight + vision QA"];
  },
  compliance:   async (job) => {
    const book = await get(`/api/books/${job.bookId}`).then((r) => r.book);
    if (book?.dir) {
      let out;
      try { out = execFileSync("node", ["scripts/compliance/check-compliance.mjs", book.dir, "--json"], { cwd: REPO_ROOT }).toString(); }
      catch (e) { out = e.stdout ? e.stdout.toString() : '{"ok":false,"counts":{"fail":-1},"checks":[]}'; }
      try { await post(`/api/books/${job.bookId}/compliance`, JSON.parse(out)); } catch {}
      let pv;
      try { pv = execFileSync("node", ["scripts/provenance/build-provenance.mjs", book.dir, "--json"], { cwd: REPO_ROOT, env: process.env, maxBuffer: 8 * 1024 * 1024 }).toString(); }
      catch (e) { pv = e.stdout ? e.stdout.toString() : "{}"; }
      try { await post(`/api/books/${job.bookId}/provenance`, JSON.parse(pv)); } catch {}
    }
    return ["ran CPSIA/COPPA/AI-disclosure checks", "wrote kdp-metadata.json", "built provenance record"];
  },
  export:       async (job) => {
    const book = await get(`/api/books/${job.bookId}`).then((r) => r.book);
    if (book?.dir) execFileSync("node", ["scripts/export/build-pdf.mjs", book.dir], { cwd: REPO_ROOT, stdio: "inherit" });
    return ["exported print-ready PDF (book.pdf) — or proof.html for manual print"];
  },
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
