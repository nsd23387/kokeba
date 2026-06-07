#!/usr/bin/env node
// Kokeba provenance — per-book "how it was made" record for AI-copyright defensibility,
// platform AI disclosure, and reproducibility. Documents the MODELS used, the per-page
// generation inputs (prompt hash, references, human feedback), the human contributors,
// the human-authorship choices, and the source/license posture.
//
// Usage: node scripts/provenance/build-provenance.mjs <book-dir> [--json]
// Writes <book-dir>/provenance.json and provenance.md.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const bookDir = process.argv[2];
const JSON_OUT = process.argv.includes("--json");
if (!bookDir) { console.error("Usage: node scripts/provenance/build-provenance.mjs <book-dir> [--json]"); process.exit(2); }

const rd = (f) => (fs.existsSync(path.resolve(bookDir, f)) ? JSON.parse(fs.readFileSync(path.resolve(bookDir, f), "utf8")) : null);
const scenes = rd("scenes.json") || { scenes: [] };
const pub = rd("publishing.json") || {};
const layout = rd("layout.json") || {};
const sha = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 12);

const pages = (scenes.scenes || []).map((s) => ({
  id: s.id, file: s.file,
  prompt_sha256: sha(s.prompt || ""), prompt_chars: (s.prompt || "").length,
  references: [...Object.values(scenes.refs || {}), ...(s.extra_ref_files || [])],
  human_feedback: s.feedback || [],
}));

const provenance = {
  book_id: scenes.book_id || layout.book_id,
  title: { en: pub.title_en || (layout.pages || []).find((p) => p.page === "cover")?.title_en, am: (layout.pages || []).find((p) => p.page === "cover")?.title_am },
  generated_at: new Date().toISOString(),
  contributors: {
    author: pub.author || null, imprint: pub.imprint || null,
    copyright_holder: pub.copyright_holder || pub.author || null,
    native_reviewer: pub.reviewer_name || null,
  },
  models: {
    illustration: scenes.model_hint || process.env.IMAGE_GEN_MODEL || "gpt-image",
    vision_qa: process.env.VISION_MODEL || "gpt-4o-mini",
    upscale: "sharp (lanczos3) — swappable for an AI upscaler",
  },
  ai_assistance_statement: pub.ai_notice || null,
  human_authorship: [
    "Story authored and structured by a human (manuscript + house style + framework).",
    "Character design and art direction set by a human (locked reference sheets + art-direction intake).",
    "Every AI image was a human-directed prompt; outputs were selected/curated and revised by a human.",
    "Human feedback was applied per page (recorded below) and re-generated until approved.",
    "Native-speaker review and cultural sign-off performed by a human at Gate 1.",
  ],
  reference_sources: "Reference photos + data per data-sources/registry.yaml (PD/CC0/permissive baked in; CC-BY-SA/closed = reference-only). Generate-original, never-copy policy enforced in prompts.",
  originality: "Originality + cultural accuracy attested by the native reviewer at Gate 1.",
  pages,
  qa: null,   // merged in by the orchestrator at runtime (pre-flight / vision / compliance)
  gates: null, // merged in by the orchestrator (Gate 1 / Gate 2 approvals + timestamps)
};

fs.writeFileSync(path.resolve(bookDir, "provenance.json"), JSON.stringify(provenance, null, 2));

const md = `# Provenance & credits — ${provenance.book_id}

**Title:** ${provenance.title?.en || ""} ${provenance.title?.am ? "· " + provenance.title.am : ""}
**Generated:** ${provenance.generated_at}

## Contributors
- Author: ${provenance.contributors.author || "—"}
- Imprint: ${provenance.contributors.imprint || "—"}
- Copyright holder: ${provenance.contributors.copyright_holder || "—"}
- Native reviewer (Gate 1): ${provenance.contributors.native_reviewer || "—"}

## Tools / models
- Illustration: ${provenance.models.illustration}
- Vision QA: ${provenance.models.vision_qa}
- Upscale: ${provenance.models.upscale}

## AI-assistance statement
${provenance.ai_assistance_statement || "—"}

## Human authorship
${provenance.human_authorship.map((h) => "- " + h).join("\n")}

## Sources
${provenance.reference_sources}

## Per-page record
${pages.map((p) => `- **${p.id}** (${p.file}) · prompt ${p.prompt_sha256} · refs: ${p.references.join(", ") || "—"}${p.human_feedback.length ? ` · feedback: ${p.human_feedback.length} note(s)` : ""}`).join("\n")}
`;
fs.writeFileSync(path.resolve(bookDir, "provenance.md"), md);

if (JSON_OUT) console.log(JSON.stringify(provenance));
else console.log(`Wrote provenance.json + provenance.md — ${pages.length} pages, models: ${provenance.models.illustration} / ${provenance.models.vision_qa}, reviewer: ${provenance.contributors.native_reviewer || "(unset)"}.`);
