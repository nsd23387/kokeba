#!/usr/bin/env node
// Shared DataForSEO Amazon client for Kokeba market/keyword tooling.
//   amazonSearchVolume(keywords) → { keyword: monthly_volume }  (demand)
//   amazonResultsCount(keyword)  → integer total competing products (competition)
// Both read DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD from env (.env auto-loaded).
// All functions no-op safely (return {} / null) when creds are absent.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

(function loadDotEnv() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
    const l = raw.trim(); if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("="); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim().replace(/\s+#.*$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
})();

export function hasCreds() {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

function authHeader() {
  return "Basic " + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
}

async function df(p, payload) {
  const r = await fetch(`https://api.dataforseo.com${p}`, { method: "POST", headers: { Authorization: authHeader(), "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`DataForSEO ${p} → HTTP ${r.status}`);
  const j = await r.json();
  const task = j.tasks?.[0];
  if (!task || (task.status_code && task.status_code !== 20000)) throw new Error(`DataForSEO ${p} → ${task?.status_message || "no task"}`);
  return task.result || [];
}

// Amazon monthly search volume for keywords → { keyword: volume }
export async function amazonSearchVolume(keywords, { location = "United States" } = {}) {
  if (!hasCreds() || !keywords?.length) return {};
  const kws = [...new Set(keywords.map((k) => String(k).toLowerCase()))].slice(0, 1000);
  const result = await df("/v3/dataforseo_labs/amazon/bulk_search_volume/live", [{ keywords: kws, location_name: location, language_name: "English" }]);
  const items = result?.[0]?.items || [];
  return Object.fromEntries(items.map((x) => [x.keyword, x.search_volume || 0]));
}

// Merchant Amazon requires a locale-qualified language_name (bare "English" is rejected, and
// omitting it is treated as a missing required field). Map the common marketplaces here.
const AMAZON_LANG = {
  "United States": "English (United States)", "United Kingdom": "English (United Kingdom)",
  "Canada": "English (Canada)", "Australia": "English (Australia)", "India": "English (India)",
  "Germany": "German (Germany)", "France": "French (France)", "Italy": "Italian (Italy)",
  "Spain": "Spanish (Spain)", "Japan": "Japanese (Japan)", "Brazil": "Portuguese (Brazil)",
};

// Total competing products on Amazon for a keyword (scoped to a department) → integer (or null)
export async function amazonResultsCount(keyword, { location = "United States", department = "Books", language } = {}) {
  if (!hasCreds() || !keyword) return null;
  const language_name = language || AMAZON_LANG[location] || "English (United States)";
  const result = await df("/v3/merchant/amazon/products/live/advanced", [{ keyword: String(keyword), location_name: location, language_name, department, depth: 100 }]);
  return result?.[0]?.se_results_count ?? null;
}
