// File-backed state for the orchestrator (contract-first; swap for Postgres later).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { freshStages } from "../../../packages/core/src/pipeline.mjs";
import { DEFAULT_CONTROLS } from "../../../packages/controls/src/control-plane.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(here, "../.data");
const DB = path.join(DATA_DIR, "state.json");

function seed() {
  return {
    controls: structuredClone(DEFAULT_CONTROLS),
    books: [
      {
        id: "ethiopia-0-3-eden-zoo",
        title: "Eden Goes to the Zoo",
        country: "Ethiopia",
        age: "0-3",
        dir: "content/examples/ethiopia-0-3/eden-goes-to-the-zoo",
        stages: { ...freshStages(), research: "done", author: "done", character: "done", illustration: "done", layout: "done" },
        scenes: ["cover","s01","s02","s03","s04","s05","s06","s07","s08","s09","s10","s11"],
      },
    ],
    jobs: [],
    chat: [], // {id, bookId, role:'user'|'assistant', text, ts}
  };
}

let state = null;
export function load() {
  if (state) return state;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB)) {
    try { state = JSON.parse(fs.readFileSync(DB, "utf8")); } catch { state = seed(); }
  } else state = seed();
  return state;
}
export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB, JSON.stringify(state, null, 2));
}
export function reset() { state = seed(); save(); return state; }

export const getControls = () => load().controls;
export const getBooks = () => load().books;
export const getBook = (id) => load().books.find((b) => b.id === id);
export const getJobs = () => load().jobs;
export const getChat = (bookId) => load().chat.filter((m) => m.bookId === bookId);

export function addJob({ bookId, stage, scope = null, note = null }) {
  const job = {
    id: randomUUID().slice(0, 8), bookId, stage, scope, note,
    status: "queued", logs: [], createdAt: Date.now(), startedAt: null, finishedAt: null,
  };
  load().jobs.push(job);
  const b = getBook(bookId);
  if (b) b.stages[stage] = "queued";
  save();
  return job;
}
export function addChat(bookId, role, text) {
  const m = { id: randomUUID().slice(0, 8), bookId, role, text, ts: Date.now() };
  load().chat.push(m); save(); return m;
}
