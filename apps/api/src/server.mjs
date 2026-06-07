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
const REPO_ROOT = path.resolve(here, "../../..");
const PORT = process.env.PORT || 8787;

// Read a book's layout.json pages (text + vocab + image filename).
function readPages(book) {
  if (!book?.dir) return [];
  const lp = path.join(REPO_ROOT, book.dir, "layout.json");
  if (!fs.existsSync(lp)) return [];
  try { return JSON.parse(fs.readFileSync(lp, "utf8")).pages || []; } catch { return []; }
}
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

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
  // HARD BLOCK: publish-side stages cannot run while QA/compliance has failures.
  const pf = preflightFail(book), cf = complianceFail(book);
  let blockReason = null;
  if ((stageId === "compliance" || stageId === "export") && pf > 0) blockReason = `pre-flight QA has ${pf} failing check(s)`;
  if (stageId === "export" && cf > 0) blockReason = `compliance has ${cf} failing check(s) (e.g. DPI/KDP spec) — not upload-ready`;
  if (blockReason) {
    book.stages[stageId] = STATUS.BLOCKED;
    (book.blocks = book.blocks || {})[stageId] = `${blockReason} — fix before ${stageId}`;
    db.save();
    return { blocked: true, reason: book.blocks[stageId] };
  }
  const gate = canDispatch(db.getControls(), sd);
  if (!gate.ok) {
    book.stages[stageId] = STATUS.BLOCKED;
    (book.blocks = book.blocks || {})[stageId] = gate.reason;
    db.save();
    return { blocked: true, reason: gate.reason };
  }
  if (book.blocks) delete book.blocks[stageId];
  const job = db.addJob({ bookId: book.id, stage: stageId, scope, note });
  return { job };
}

// Persist reviewer feedback INTO the scene so it's permanent context on every future
// regeneration (embedded alongside the scene prompt + requirements).
function persistFeedback(book, scope, note) {
  if (!book?.dir || !scope || !note) return;
  const sp = path.join(REPO_ROOT, book.dir, "scenes.json");
  if (!fs.existsSync(sp)) return;
  try {
    const m = JSON.parse(fs.readFileSync(sp, "utf8"));
    const sc = (m.scenes || []).find((s) => s.id === scope);
    if (sc) { sc.feedback = sc.feedback || []; sc.feedback.push(note); fs.writeFileSync(sp, JSON.stringify(m, null, 2)); }
  } catch {}
}
const preflightFail = (b) => (b.preflight && b.preflight.counts ? b.preflight.counts.fail || 0 : 0);
const complianceFail = (b) => (b.compliance && b.compliance.counts ? b.compliance.counts.fail || 0 : 0);
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

  // book pages (layout text + vocab + image filename)
  if (req.method === "GET" && p.match(/^\/api\/books\/[^/]+\/pages$/)) {
    const b = db.getBook(p.split("/")[3]);
    return b ? json(res, 200, { pages: readPages(b) }) : json(res, 404, { error: "no book" });
  }
  // proof stream (SSE) — emits one page at a time for the "assembling proof" effect
  if (req.method === "GET" && p.match(/^\/api\/books\/[^/]+\/proof-stream$/)) {
    const b = db.getBook(p.split("/")[3]);
    if (!b) return json(res, 404, { error: "no book" });
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": "*" });
    const pages = readPages(b);
    res.write(`event: meta\ndata: ${JSON.stringify({ total: pages.length, title: b.title })}\n\n`);
    let i = 0;
    const tick = setInterval(() => {
      if (i >= pages.length) { res.write(`event: done\ndata: {}\n\n`); clearInterval(tick); return res.end(); }
      res.write(`event: page\ndata: ${JSON.stringify({ index: i, page: pages[i] })}\n\n`);
      i++;
    }, 420);
    req.on("close", () => clearInterval(tick));
    return;
  }
  // serve the laid-out proof.html (rewrite art/ paths to the art endpoint so images load)
  if (req.method === "GET" && p.match(/^\/api\/books\/[^/]+\/proof$/)) {
    const b = db.getBook(p.split("/")[3]);
    if (!b?.dir) return json(res, 404, { error: "no book" });
    const fp = path.join(REPO_ROOT, b.dir, "proof.html");
    if (!fs.existsSync(fp)) return json(res, 404, { error: "proof not built — run Layout" });
    const html = fs.readFileSync(fp, "utf8").replace(/src="art\//g, `src="/api/art/${b.id}/`);
    res.writeHead(200, { "content-type": "text/html", "access-control-allow-origin": "*" });
    return res.end(html);
  }
  // serve a book's art file
  if (req.method === "GET" && p.match(/^\/api\/art\/[^/]+\/[^/]+$/)) {
    const [, , , bookId, file] = p.split("/");
    const b = db.getBook(bookId);
    if (!b?.dir || file.includes("..")) return json(res, 404, { error: "not found" });
    const fp = path.join(REPO_ROOT, b.dir, "art", file);
    if (!fs.existsSync(fp)) return json(res, 404, { error: "no art" });
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "access-control-allow-origin": "*" });
    return fs.createReadStream(fp).pipe(res);
  }
  // Gate 1 review submission: corrections + flags + cultural sign-off -> approve or return
  if (req.method === "POST" && p.match(/^\/api\/books\/[^/]+\/gate1$/)) {
    const bookId = p.split("/")[3]; const body = await readBody(req);
    const b = db.getBook(bookId); if (!b) return json(res, 404, { error: "no book" });
    b.gate1 = { ...body, at: Date.now() }; // { decision:'approve'|'return', corrections:{}, flags:{}, cultural_ok, notes }
    if (body.decision === "approve" && preflightFail(b) > 0)
      return json(res, 200, { blocked: true, reason: `pre-flight QA has ${preflightFail(b)} failing check(s) — fix before approving Gate 1` });
    if (body.decision === "approve") { b.stages.gate1 = STATUS.DONE; advanceAfter(b, "gate1"); db.addChat(bookId, "assistant", "Gate 1 approved — advancing to compliance."); }
    else { b.stages.gate1 = STATUS.PENDING; b.stages.illustration = STATUS.PENDING; b.stages.layout = STATUS.PENDING;
      db.addChat(bookId, "user", `Gate 1 returned: ${body.notes || "changes requested"}`); }
    db.save();
    return json(res, 200, { ok: true, book: b });
  }

  // pre-flight QA results (worker posts; UI reads from /api/state)
  if (req.method === "POST" && p.match(/^\/api\/books\/[^/]+\/preflight$/)) {
    const b = db.getBook(p.split("/")[3]); if (!b) return json(res, 404, { error: "no book" });
    const body = await readBody(req); b.preflight = { ...body, at: Date.now() }; db.save();
    return json(res, 200, { ok: true });
  }

  // compliance report (worker posts)
  if (req.method === "POST" && p.match(/^\/api\/books\/[^/]+\/compliance$/)) {
    const b = db.getBook(p.split("/")[3]); if (!b) return json(res, 404, { error: "no book" });
    const body = await readBody(req); b.compliance = { ...body, at: Date.now() }; db.save();
    return json(res, 200, { ok: true });
  }

  // vision QA results (worker posts; advisory)
  if (req.method === "POST" && p.match(/^\/api\/books\/[^/]+\/vision$/)) {
    const b = db.getBook(p.split("/")[3]); if (!b) return json(res, 404, { error: "no book" });
    const body = await readBody(req); b.vision = { ...body, at: Date.now() }; db.save();
    return json(res, 200, { ok: true });
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
    const { bookId, stage: st, scope, note } = await readBody(req);
    const b = db.getBook(bookId);
    if (!b) return json(res, 404, { error: "no book" });
    if (note) db.addChat(bookId, "user", `${scope ? scope + ": " : ""}${note}`);
    if (st === "illustration" && scope && note) persistFeedback(b, scope, note); // embed feedback into the scene
    return json(res, 200, enqueueStage(b, st, { scope, note }));
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
    if (preflightFail(b) > 0) return json(res, 200, { blocked: true, reason: `pre-flight QA has ${preflightFail(b)} failing check(s) — fix before approving ${st}` });
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
