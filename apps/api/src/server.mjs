#!/usr/bin/env node
// Kokeba API — orchestrator + control plane (contract-first; mocked stage execution).
// Pure Node, no deps. Serves the operator console and the JSON API.
//   node apps/api/src/server.mjs   (PORT env, default 8787)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as db from "./store.mjs";
import { STAGES, stage, nextStageId, isGate, STATUS } from "../../../packages/core/src/pipeline.mjs";
import { canDispatch, shouldAutoAdvance, chargeBudget } from "../../../packages/controls/src/control-plane.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CONSOLE = path.resolve(here, "../../web/src/console.html");
const PORT = process.env.PORT || 8787;

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { r(d ? JSON.parse(d) : {}); } catch { r({}); } }); });

// --- orchestration helpers ---------------------------------------------------
function enqueueStage(book, stageId, { scope = null, note = null } = {}) {
  const sd = stage(stageId);
  if (!sd) return { error: "unknown stage" };
  if (isGate(stageId)) {                       // gates do no work — they wait for a human
    book.stages[stageId] = STATUS.NEEDS_APPROVAL;
    db.save();
    return { gate: true, stage: stageId };
  }
  const gate = canDispatch(db.getControls(), sd);
  if (!gate.ok) { book.stages[stageId] = STATUS.BLOCKED; db.save(); return { blocked: true, reason: gate.reason }; }
  const job = db.addJob({ bookId: book.id, stage: stageId, scope, note });
  return { job };
}
function advanceAfter(book, stageId) {           // autopilot auto-advance
  const nextId = nextStageId(stageId);
  if (!nextId) return;
  if (isGate(nextId)) { book.stages[nextId] = STATUS.NEEDS_APPROVAL; db.save(); return; }
  if (shouldAutoAdvance(db.getControls(), nextId)) enqueueStage(book, nextId);
}

// --- mock "AI" that turns a chat message into an action ----------------------
// TODO: replace with a real LLM call via packages/agents (author/illustration).
function interpretChat(book, text) {
  const t = text.toLowerCase();
  const sceneMatch = t.match(/\b(cover|s\d{1,2})\b/);
  const wantsRegen = /(regen|re-?generate|redo|again|friendl|fix|change|crop|float|too close|safer|softer)/.test(t);
  if (sceneMatch && (wantsRegen || /lion|monkey|camel|hippo|leopard|giraffe|elephant/.test(t))) {
    const sc = sceneMatch[1];
    enqueueStage(book, "illustration", { scope: sc, note: text });
    return `Got it — queued a regeneration of ${sc} with that feedback. It'll appear in the proof when the worker finishes.`;
  }
  if (wantsRegen) return "Tell me which page (e.g. “s05” or “cover”) and what to change, and I'll queue that regeneration.";
  return "Noted. I can run a stage, approve a gate, or regenerate a page — e.g. “regenerate s05, monkey too close”.";
}

// --- routes ------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const p = u.pathname;
  if (req.method === "OPTIONS") return json(res, 204, {});

  // console
  if (req.method === "GET" && (p === "/" || p === "/index.html")) {
    if (fs.existsSync(CONSOLE)) { res.writeHead(200, { "content-type": "text/html" }); return res.end(fs.readFileSync(CONSOLE)); }
    return json(res, 404, { error: "console not found" });
  }

  // state
  if (req.method === "GET" && p === "/api/state")
    return json(res, 200, { stages: STAGES, controls: db.getControls(), books: db.getBooks(), jobs: db.getJobs().slice(-40).reverse() });
  if (req.method === "GET" && p.startsWith("/api/books/")) {
    const b = db.getBook(p.split("/")[3]);
    return b ? json(res, 200, { book: b, chat: db.getChat(b.id) }) : json(res, 404, { error: "no book" });
  }

  // run a stage
  if (req.method === "POST" && p === "/api/jobs") {
    const { bookId, stage: st, scope } = await readBody(req);
    const b = db.getBook(bookId);
    if (!b) return json(res, 404, { error: "no book" });
    return json(res, 200, enqueueStage(b, st, { scope }));
  }
  // worker: claim next queued job
  if (req.method === "POST" && p === "/api/next-job") {
    const j = db.getJobs().find((x) => x.status === "queued");
    if (!j) return json(res, 200, { job: null });
    j.status = "running"; j.startedAt = Date.now();
    const b = db.getBook(j.bookId); if (b) b.stages[j.stage] = STATUS.RUNNING;
    db.save();
    return json(res, 200, { job: j });
  }
  // worker: complete a job
  if (req.method === "POST" && p.match(/^\/api\/jobs\/[^/]+\/complete$/)) {
    const id = p.split("/")[3]; const { logs = [] } = await readBody(req);
    const j = db.getJobs().find((x) => x.id === id);
    if (!j) return json(res, 404, { error: "no job" });
    j.status = "done"; j.finishedAt = Date.now(); j.logs = logs;
    const b = db.getBook(j.bookId);
    if (b) { b.stages[j.stage] = STATUS.DONE; chargeBudget(db.getControls(), stage(j.stage)?.cost || 0); advanceAfter(b, j.stage); }
    db.save();
    return json(res, 200, { ok: true });
  }
  // approve a gate
  if (req.method === "POST" && p.match(/^\/api\/books\/[^/]+\/approve$/)) {
    const bookId = p.split("/")[3]; const { stage: st } = await readBody(req);
    const b = db.getBook(bookId); if (!b) return json(res, 404, { error: "no book" });
    b.stages[st] = STATUS.DONE; advanceAfter(b, st); db.save();
    return json(res, 200, { ok: true, book: b });
  }
  // controls
  if (req.method === "POST" && p === "/api/controls") {
    const patch = await readBody(req); const c = db.getControls();
    if (patch.approval_mode) c.approval_mode = patch.approval_mode;
    if (patch.kill_switch) c.kill_switch = patch.kill_switch;
    if (patch.budget) Object.assign(c.budget, patch.budget);
    db.save();
    return json(res, 200, { controls: c });
  }
  // chat
  if (req.method === "POST" && p === "/api/chat") {
    const { bookId, text } = await readBody(req);
    const b = db.getBook(bookId); if (!b) return json(res, 404, { error: "no book" });
    db.addChat(bookId, "user", text);
    const reply = interpretChat(b, text);
    const m = db.addChat(bookId, "assistant", reply);
    return json(res, 200, { reply: m });
  }
  if (req.method === "POST" && p === "/api/reset") return json(res, 200, db.reset());

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`Kokeba API + console on http://localhost:${PORT}`));
