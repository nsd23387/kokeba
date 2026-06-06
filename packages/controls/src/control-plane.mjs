// Control plane — the safety + autonomy rules the orchestrator obeys.
// Mirrors the .env control knobs (APPROVAL_MODE, KILL_SWITCH, budget caps).
import { isGate } from "../../core/src/pipeline.mjs";

export const DEFAULT_CONTROLS = {
  approval_mode: "copilot", // "copilot" = human runs each stage; "autopilot" = engine auto-advances
  kill_switch: "off",       // "on" pauses ALL job dispatch
  budget: { daily_cap_usd: 20, monthly_cap_usd: 400, spent_today_usd: 0, spent_month_usd: 0 },
};

// Can a stage be dispatched right now? Returns { ok, reason }.
export function canDispatch(controls, stageDef) {
  if (controls.kill_switch === "on") return { ok: false, reason: "kill switch is ON" };
  const b = controls.budget;
  const cost = stageDef?.cost ?? 0;
  if (cost > 0 && b.spent_today_usd + cost > b.daily_cap_usd)
    return { ok: false, reason: `daily budget cap ($${b.daily_cap_usd}) would be exceeded` };
  if (cost > 0 && b.spent_month_usd + cost > b.monthly_cap_usd)
    return { ok: false, reason: `monthly budget cap ($${b.monthly_cap_usd}) would be exceeded` };
  return { ok: true };
}

// After a stage finishes, should the engine auto-advance to the next one?
// Autopilot auto-runs normal stages; gates ALWAYS wait for a human.
export function shouldAutoAdvance(controls, nextId) {
  if (!nextId) return false;
  if (controls.approval_mode !== "autopilot") return false;
  if (controls.kill_switch === "on") return false;
  if (isGate(nextId)) return false;
  return true;
}

export function chargeBudget(controls, cost = 0) {
  if (cost > 0) {
    controls.budget.spent_today_usd += cost;
    controls.budget.spent_month_usd += cost;
  }
  return controls;
}
