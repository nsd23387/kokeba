#!/usr/bin/env node
// Kokeba new-title scaffold — turns an INTAKE into a complete, pipeline-ready book:
// layout.json, scenes.json (with the universal safety / zoo-identity / text-safe rules),
// publishing.json, manuscript.md, and an art/ folder. Country-agnostic: the story comes
// from the journey-call-response 0-3 framework filled with the intake's child + animals.
//
// Usage: node scripts/new-title/scaffold.mjs <intake.json> [<content-root>]
// intake.json: { book_id, title_en, title_am, country, language, child_name,
//                animals:[{en,am,translit}], author?, reviewer_name?, setting? }
//
// (An LLM "author" can later replace the templated copy; this produces a correct book today.)

import fs from "node:fs";
import path from "node:path";

const intakePath = process.argv[2];
const contentRoot = process.argv[3] || "content";
if (!intakePath) { console.error("Usage: node scripts/new-title/scaffold.mjs <intake.json> [content-root]"); process.exit(2); }
const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));

const child = intake.child_name || "the child";
const country = intake.country || "the country";
const setting = intake.setting || "zoo";
const animals = (intake.animals || []).slice(0, 9);
const bookId = intake.book_id || `${(country || "country").toLowerCase()}-0-3-${child.toLowerCase()}-${setting}`;
const bookDir = path.resolve(contentRoot, bookId);
fs.mkdirSync(path.join(bookDir, "art"), { recursive: true });

// per-animal beat templates (action + couplet + interaction + scene + barrier)
const A = {
  lion: { couplet: [`A lion stands strong and proud.`, `"ROAR!" says ${child}, big and loud.`], interaction: "Can you roar?", scene: "a big, cuddly friendly lion with a soft dark mane", predator: true },
  elephant: { couplet: [`An elephant stomps down the way.`, `Its trunk waves high to say, "Good day!"`], interaction: "Can you wave?", scene: "a happy round elephant lifting its trunk to wave", predator: false },
  monkey: { couplet: [`A monkey swings from tree to tree.`, `"Ee-ee-ee!" chatters he.`], interaction: "Can you chatter?", scene: "a playful monkey on a climbing frame behind a tall mesh fence (set back, clearly separated)", predator: false },
  giraffe: { couplet: [`A giraffe stretches to the sky.`, `Its long neck reaches way up high.`], interaction: "Can you stretch tall?", scene: "a tall gentle giraffe whose body stays back and lowers only its long neck toward the rail", predator: false },
  camel: { couplet: [`A camel walks with bumpity bump.`, `Wiggle and giggle— look at that hump!`], interaction: "Can you bounce?", scene: "a calm smiling one-humped camel behind a low rail", predator: false },
  hippo: { couplet: [`A hippo splashes in the pool.`, `Splashing water is very cool!`], interaction: "Can you splash?", scene: "a round jolly hippo with a soft happy mouth splashing in its pool, set back behind a rail", predator: true },
  leopard: { couplet: [`A leopard tiptoes soft and slow.`, `Where is it going? Nobody knows.`], interaction: "Can you tiptoe?", scene: "a gentle spotted leopard tiptoeing softly, set back on rocks", predator: true },
  zebra: { couplet: [`A zebra trots in black and white.`, `Stripey stripes are such a sight!`], interaction: "Can you trot?", scene: "a friendly striped zebra trotting behind a low rail", predator: false },
  rhino: { couplet: [`A rhino rumbles, big and round.`, `Stomp, stomp — hear that sound!`], interaction: "Can you stomp?", scene: "a calm friendly rhino standing well back behind a sturdy rail", predator: false },
};
const beat = (en) => A[en.toLowerCase()] || { couplet: [`A ${en} is here to play.`, `Say hello to it today!`], interaction: `Can you say ${en}?`, scene: `a friendly ${en} in its enclosure`, predator: false };

const heritage = { am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba", so: "Somali" }[intake.language || "am"] || "the heritage language";

// --- manuscript ---
const animalLines = animals.map((a, i) => {
  const b = beat(a.en);
  return `**Spread ${3 + i}**\n- Left: ${b.couplet.join(" / ")} / *${b.interaction}*\n- Right: ${a.en} illustration · ${a.am} · ${a.translit}`;
}).join("\n\n");
fs.writeFileSync(path.join(bookDir, "manuscript.md"),
`# ${intake.title_en} — ${intake.title_am || ""}\n**Kokeba · Ages 0–3 · ${country}**\nLayout: LEFT = English story · RIGHT = illustration + ${heritage} word.\n\n**Spread 1** — Good morning, ${child}, sleepyhead. / Time to wake and leave your bed.\n**Spread 2** — Off we go to the ${setting} today!\n\n${animalLines}\n\n**Reflection** — We saw animals, big and small. / ${child}'s favorite? Loved them all!\n**Final** — The trip rolls home, the sky turns blue. / "${child} waves, bye-bye, ${setting}!"\n`);

// --- layout.json ---
const pages = [
  { page: "cover", image: "cover.png", title_en: intake.title_en, title_am: intake.title_am || "" },
  { page: "dedication", image: null, english: `For our little star ★` },
  { page: "1", image: "s01.png", english: `Good morning, ${child}, sleepyhead.\nTime to wake and leave your bed.` },
  { page: "2", image: "s02.png", english: `Shoes on feet, off we go.\nTo the ${setting}— let's say hello!` },
];
animals.forEach((a, i) => {
  const b = beat(a.en);
  pages.push({ page: String(3 + i), image: `s${String(3 + i).padStart(2, "0")}.png`, english: b.couplet.join("\n"), interaction: b.interaction, vocab: { am: a.am, translit: a.translit, en: a.en } });
});
const refl = 3 + animals.length, final = refl + 1;
pages.push({ page: String(refl), image: `s${String(refl).padStart(2, "0")}.png`, english: `We saw animals, big and small.\n${child}'s favorite? Loved them all!` });
pages.push({ page: String(final), image: `s${String(final).padStart(2, "0")}.png`, english: `The trip rolls home. The sky turns blue.\n${child} waves, "Bye-bye, ${setting}!"` });
pages.push({ page: "end", image: null, english: "Kokeba ★ — A story for every little star." });

fs.writeFileSync(path.join(bookDir, "layout.json"), JSON.stringify({
  book_id: bookId, trim: "8.5x8.5in", trim_shape: "square", bleed_in: 0.125, art_dir: "art",
  script_font: "Noto Sans Ethiopic", languages: ["en", intake.language || "am"],
  template: { status: "scaffolded" }, pages,
}, null, 2));

// --- scenes.json ---
const shared = `Soft, warm children's storybook illustration — gentle painterly shading, rounded friendly shapes, cozy warm lighting. Ages 0-3: NO text in the image, square composition, soft uncluttered background, ONE clear subject. IDENTITY from attachments: ${child} (toddler) and, where attached, Mama — keep faces/hair identical to the references; everyday casual clothes (not formal). Setting reads as ${country}. FRIENDLY FACE: every animal has a soft gentle smile, warm eyes, never scary; no bared teeth or snarl. ZOO IDENTITY: one consistent entrance gate + one emblem; every enclosure uses the same low wood-rail-on-stone-curb fence. BARRIER REALISM: predators (lion, leopard, hippo) sit SET BACK across a clearly visible WATER MOAT behind the rail; the child is always safely on the visitor side. RENDER QUALITY: finish every surface, no melting/blank fences or empty sand. TEXT-SAFE ZONE: keep the bottom ~18% calm (no faces/feet/key subjects) for the vocab band.`;
const scenes = [
  { id: "cover", file: "cover.png", refs: ["child", "mama"], prompt: `Scene: ${child} and Mama arriving at the ${country} ${setting} entrance gate, FACING THE VIEWER with joy; animals gated behind. Keep the top third clear sky for the title; no text.` },
  { id: "s01", file: "s01.png", refs: ["child"], prompt: `Scene: ${child} waking in a cozy bed at home, stretching with a sleepy happy smile; soft morning light. No ${setting}.` },
  { id: "s02", file: "s02.png", refs: ["child", "mama"], prompt: `Scene: ${child} holding Mama's hand walking toward the ${setting} entrance gate, pointing ahead, excited.` },
];
animals.forEach((a, i) => {
  const b = beat(a.en);
  scenes.push({ id: `s${String(3 + i).padStart(2, "0")}`, file: `s${String(3 + i).padStart(2, "0")}.png`, refs: ["child", "mama"],
    prompt: `ZOO SCENE (${a.en} / ${a.translit}): ${b.scene}.${b.predator ? " Set BACK behind a visible water moat + sturdy rail." : ""} ${child} at the rail on the visitor side doing the action ("${b.interaction}"), delighted; Mama beside her.` });
});
scenes.push({ id: `s${String(refl).padStart(2, "0")}`, file: `s${String(refl).padStart(2, "0")}.png`, refs: ["child", "mama"], extra_ref_files: animals.slice(0, 3).map((_, i) => `s${String(3 + i).padStart(2, "0")}.png`), prompt: `ZOO SCENE (reflection): ${child} and Mama waving goodbye; the animals wave back from behind their fences. ANIMAL CONSISTENCY: match the attached animal references.` });
scenes.push({ id: `s${String(final).padStart(2, "0")}`, file: `s${String(final).padStart(2, "0")}.png`, refs: ["child", "mama"], prompt: `Scene (final): ${child} beside Mama heading home, sleepy happy smile; evening sky, first stars. Tender, bedtime-warm.` });
fs.writeFileSync(path.join(bookDir, "scenes.json"), JSON.stringify({
  book_id: bookId, model_hint: "gpt-image", size: "1024x1024", art_dir: "art",
  refs: { child: "art/child_everyday_ref.png", mama: "art/mama_everyday_ref.png" },
  shared_block: shared, scenes,
}, null, 2));

// --- publishing.json ---
fs.writeFileSync(path.join(bookDir, "publishing.json"), JSON.stringify({
  author: intake.author || "", imprint: "Kokeba", copyright_year: new Date().getFullYear(), copyright_holder: intake.author || "",
  edition: "First edition", isbn: "", rights: "All rights reserved.",
  dedication: "For our little star ★", about: `Kokeba makes warm, inclusive first books carrying a child's heritage language.`,
  ai_notice: "The illustrations and text in this book were created with the assistance of AI.",
  reviewer_name: intake.reviewer_name || "", language_note: `Told in English with ${heritage} vocabulary and transliteration.`, contact: "",
}, null, 2));

fs.writeFileSync(path.join(bookDir, "art", "README.md"), `# art/\nGenerate character reference sheets (child_everyday_ref.png, mama_everyday_ref.png) first, then run illustration.\n`);
console.log(`Scaffolded ${bookId} -> ${path.relative(process.cwd(), bookDir)} (${pages.length} pages, ${animals.length} animals).`);
