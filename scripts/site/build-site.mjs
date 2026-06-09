#!/usr/bin/env node
// Kokeba site generator — builds the marketing site from book data.
// Country-agnostic + templated: scans every book under content/ and emits ONE landing page
// per book (its own URL + SEO + JSON-LD), grouped by heritage language, plus a home page,
// an about page, sitemap.xml and robots.txt. Add a book → its page generates itself.
//
// Usage: node scripts/site/build-site.mjs [--out apps/site/dist]
// Reads: apps/site/site.config.json + each book's layout.json / listing-metadata.json /
//        publishing.json / market.json + art/cover.png.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = (() => { const i = process.argv.indexOf("--out"); return path.resolve(ROOT, i >= 0 ? process.argv[i + 1] : "apps/site/dist"); })();
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/site/site.config.json"), "utf8"));
const B = cfg.brand;
const BASE = B.base_url.replace(/\/$/, "");

const HERITAGE = { am: "Amharic", sw: "Swahili", ha: "Hausa", yo: "Yoruba", so: "Somali", ti: "Tigrinya", om: "Oromo" };
const COUNTRY = { ethiopia: "Ethiopia", kenya: "Kenya", nigeria: "Nigeria", ghana: "Ghana", somalia: "Somalia" };
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strip = (s = "") => String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const rd = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);

// ---- discover books ----------------------------------------------------------
function findBooks(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    if (fs.existsSync(path.join(p, "layout.json"))) acc.push(p);
    else findBooks(p, acc);
  }
  return acc;
}

function loadBook(dir) {
  const layout = rd(path.join(dir, "layout.json"));
  const listing = rd(path.join(dir, "listing-metadata.json"));
  const pub = rd(path.join(dir, "publishing.json"));
  const market = rd(path.join(dir, "market.json"));
  const cover = fs.existsSync(path.join(dir, "art", "cover.png")) ? path.join(dir, "art", "cover.png") : null;
  const id = layout.book_id;
  const conf = (cfg.books || {})[id] || {};
  const coverPage = (layout.pages || []).find((p) => p.page === "cover") || {};
  const langCode = (layout.languages || ["en", "am"]).find((x) => x !== "en") || "am";
  const heritage = HERITAGE[langCode] || langCode;
  const countryKey = Object.keys(COUNTRY).find((c) => id.includes(c)) || (dir.split(path.sep).find((s) => COUNTRY[s]) || "");
  const country = COUNTRY[countryKey] || cap(countryKey);
  const vocab = (layout.pages || []).filter((p) => p.vocab).map((p) => p.vocab);
  const slug = path.basename(dir);
  const title = coverPage.title_en || (listing && listing.title) || id;
  const subtitle = (listing && listing.subtitle) || `A first-words ${heritage} & English story`;
  const description = listing ? strip(listing.description_html) : `${title} — a bilingual ${heritage} and English picture book from Kokeba.`;
  const keywords = (listing && listing.kdp_keyword_slots) || [];
  const concept = layout.concept || "story";
  return {
    id, slug, dir, title, title_am: coverPage.title_am || "", subtitle, description, keywords, vocab,
    heritage, langCode, country, concept, cover,
    age: layout.age_range || (listing && listing.age_range) || "2-5",
    author: (pub && pub.author) || B.legal_name,
    status: conf.status || "coming_soon",
    amazon_url: conf.amazon_url || "",
    featured: !!conf.featured, order: conf.order || 99,
    url: `/books/${langCode}/${slug}/`,
  };
}

// ---- shared chrome -----------------------------------------------------------
const STATUS_LABEL = { available: "Available now", coming_soon: "Coming soon", in_production: "In production" };

function head({ title, description, canonical, image, jsonld }) {
  const img = image ? `${BASE}${image}` : "";
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(B.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${img ? `<meta property="og:image" content="${esc(img)}">` : ""}
<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${img ? `<meta name="twitter:image" content="${esc(img)}">` : ""}
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,400;9..144,0,500;9..144,0,600;9..144,1,500&family=Noto+Sans+Ethiopic:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}`;
}

const nav = (prefix = "") => `<header class="nav"><a class="brand" href="${prefix}/"><span class="stars">&#9733;</span> ${esc(B.name)}</a>
<nav><a href="${prefix}/#books">Books</a><a href="${prefix}/about/">About</a><a href="${prefix}/#newsletter">Newsletter</a></nav></header>`;

const footer = () => `<footer class="footer"><div class="stars">&#9733;</div>
<p>${esc(B.name)} — ${esc(B.tagline)}.</p>
<p class="muted">&copy; ${new Date().getFullYear()} ${esc(B.legal_name)}. Books created with AI assistance.</p></footer>`;

const newsletter = () => `<section class="newsletter" id="newsletter"><div class="wrap-narrow">
<h2>Get the next story first</h2>
<p>New Kokeba books, in your child's heritage language. No spam.</p>
<form class="nl-form" ${cfg.newsletter.action ? `action="${esc(cfg.newsletter.action)}" method="POST"` : 'onsubmit="return false"'}>
<input type="email" name="email" placeholder="your@email.com" required aria-label="Email address">
<button type="submit">Notify me</button>
</form>
${cfg.newsletter.action ? "" : '<p class="muted small">Newsletter not connected yet — set <code>newsletter.action</code> in site.config.json to a form provider.</p>'}
</div></section>`;

function buyButton(b) {
  if (b.status === "available") {
    const live = b.amazon_url && !b.amazon_url.startsWith("#");
    return `<a class="btn btn-buy" href="${esc(b.amazon_url || "#")}"${live ? ' target="_blank" rel="noopener"' : ' data-placeholder="1"'}>Buy on Amazon</a>${live ? "" : '<p class="muted small">Buy link is a placeholder — set this book\'s <code>amazon_url</code> in site.config.json.</p>'}`;
  }
  return `<a class="btn btn-soon" href="/#newsletter">${esc(STATUS_LABEL[b.status] || "Coming soon")} — get notified</a>`;
}

function bookCard(b) {
  return `<a class="card" href="${b.url}">
  <div class="card-cover">${b.cover ? `<img src="${b.url}cover.png" alt="${esc(b.title)} cover" loading="lazy">` : `<div class="cover-ph"><span>${esc(b.heritage)}</span></div>`}</div>
  <div class="card-body"><span class="badge badge-${b.status}">${esc(STATUS_LABEL[b.status])}</span>
  <h3>${esc(b.title)}</h3><p class="muted">${esc(b.heritage)} &middot; ${esc(b.country)} &middot; Ages ${esc(b.age)}</p></div></a>`;
}

// ---- pages -------------------------------------------------------------------
function pageHTML(inner, headHTML, prefix = "") {
  return `<!DOCTYPE html><html lang="en"><head>${headHTML}</head><body>${nav(prefix)}<main>${inner}</main>${footer()}
<script>document.querySelectorAll('[data-placeholder]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();alert('This book isn\\'t live on Amazon yet. Set its amazon_url in site.config.json once it is.');}));</script>
</body></html>`;
}

function homePage(books) {
  const featured = books.find((b) => b.featured) || books[0];
  const byLang = {};
  for (const b of books) (byLang[b.heritage] = byLang[b.heritage] || []).push(b);
  const lineup = Object.entries(byLang).map(([lang, list]) =>
    `<div class="lang-group"><h3 class="lang-h">${esc(lang)}</h3><div class="grid">${list.map(bookCard).join("")}</div></div>`).join("");
  const jsonld = { "@context": "https://schema.org", "@type": "Organization", name: B.legal_name, alternateName: B.name, url: BASE + "/", slogan: B.tagline, description: B.description, email: B.email };
  const inner = `
<section class="hero"><div class="wrap">
  <div class="hero-text"><div class="stars">&#9733;</div>
    <h1>${esc(B.name)}</h1><p class="lede">${esc(B.tagline)}.</p>
    <p>${esc(B.description)}</p>
    <div class="hero-cta"><a class="btn" href="#books">See the books</a><a class="btn btn-ghost" href="/about/">Our story</a></div>
  </div>
  ${featured && featured.cover ? `<div class="hero-cover"><img src="${featured.url}cover.png" alt="${esc(featured.title)} cover"></div>` : ""}
</div></section>
<section class="books" id="books"><div class="wrap"><h2>The Kokeba library</h2>${lineup}</div></section>
${newsletter()}`;
  return pageHTML(inner, head({ title: `${B.name} — ${B.tagline}`, description: B.description, canonical: BASE + "/", image: featured && featured.cover ? featured.url + "cover.png" : "", jsonld }));
}

function aboutPage() {
  const jsonld = { "@context": "https://schema.org", "@type": "AboutPage", name: `About ${B.name}`, url: BASE + "/about/", publisher: { "@type": "Organization", name: B.legal_name } };
  const inner = `<section class="prose"><div class="wrap-narrow"><div class="stars">&#9733;</div>
  <h1>About ${esc(B.name)}</h1>
  <p class="lede">${esc(B.description)}</p>
  <p>Every child deserves to see themselves — and hear their family's language — in the books they grow up with. ${esc(B.name)} makes warm, gentle first books that pair an everyday adventure with a handful of heritage-language words, designed to be read aloud together.</p>
  <p>Each title is made for a specific community, in that community's language, with culturally grounded illustration. We start with the very youngest readers and grow with them.</p>
  <h2>How we make books</h2>
  <p>Stories are crafted with AI assistance and reviewed for language and cultural accuracy. We believe in being open about how our books are made — every title carries a clear note of AI assistance.</p>
  </div></section>${newsletter()}`;
  return pageHTML(inner, head({ title: `About — ${B.name}`, description: `About ${B.name}: ${B.tagline}.`, canonical: BASE + "/about/", jsonld }), "");
}

function bookPage(b) {
  const canonical = BASE + b.url;
  const jsonld = {
    "@context": "https://schema.org", "@type": "Book", name: b.title, ...(b.title_am ? { alternateName: b.title_am } : {}),
    inLanguage: ["en", b.langCode], bookFormat: "https://schema.org/Paperback",
    author: { "@type": "Organization", name: b.author }, publisher: { "@type": "Organization", name: B.legal_name },
    about: `${b.heritage} heritage language for children`, audience: { "@type": "PeopleAudience", suggestedMinAge: 2, suggestedMaxAge: 5 },
    description: b.description, url: canonical, ...(b.cover ? { image: canonical + "cover.png" } : {}),
    ...(b.status === "available" && b.amazon_url && !b.amazon_url.startsWith("#") ? { offers: { "@type": "Offer", url: b.amazon_url, availability: "https://schema.org/InStock" } } : {}),
  };
  const vocabRows = b.vocab.map((v) => `<tr><td class="v-en">${esc(cap(v.en))}</td><td class="v-tr">${esc(v.translit)}</td><td class="v-am">${esc(v.am)}</td></tr>`).join("");
  const inner = `
<section class="book-hero"><div class="wrap book-grid">
  <div class="book-cover">${b.cover ? `<img src="cover.png" alt="${esc(b.title)} cover">` : `<div class="cover-ph"><span>${esc(b.heritage)}</span></div>`}</div>
  <div class="book-info"><span class="badge badge-${b.status}">${esc(STATUS_LABEL[b.status])}</span>
    <h1>${esc(b.title)}</h1>${b.title_am ? `<p class="title-am">${esc(b.title_am)}</p>` : ""}
    <p class="lede">${esc(b.subtitle)}</p>
    <p class="meta">${esc(b.heritage)} &amp; English &middot; ${esc(b.country)} &middot; Ages ${esc(b.age)} &middot; Paperback &amp; Kindle</p>
    <p>${esc(b.description)}</p>
    <div class="book-cta">${buyButton(b)}</div>
  </div>
</div></section>
${b.vocab.length ? `<section class="vocab"><div class="wrap-narrow"><h2>Words you'll learn together</h2>
  <table class="v-table"><thead><tr><th>English</th><th>Say it</th><th>${esc(b.heritage)}</th></tr></thead><tbody>${vocabRows}</tbody></table></div></section>` : ""}
${newsletter()}`;
  return pageHTML(inner, head({ title: `${b.title} — ${b.heritage} children's book | ${B.name}`, description: b.description.slice(0, 155), canonical, image: b.cover ? b.url + "cover.png" : "", jsonld }), "");
}

// ---- CSS ---------------------------------------------------------------------
const css = `:root{--navy:${B.palette.navy};--gold:${B.palette.gold};--page:${B.palette.page};--sage:${B.palette.sage};--cream:${B.palette.cream}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Fraunces',Georgia,serif;color:var(--navy);background:var(--page);line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}.wrap-narrow{max-width:720px;margin:0 auto;padding:0 24px}
a{color:var(--navy)}.muted{color:#7d7a6c}.small{font-size:13px}.stars{color:var(--gold)}
.nav{display:flex;align-items:center;justify-content:space-between;max-width:1080px;margin:0 auto;padding:18px 24px}
.brand{font-weight:600;font-size:22px;text-decoration:none}.nav nav a{margin-left:20px;text-decoration:none;color:#4a4e66}.nav nav a:hover{color:var(--gold)}
.hero{background:var(--cream);padding:54px 0}.hero .wrap{display:flex;gap:40px;align-items:center;flex-wrap:wrap}
.hero-text{flex:1;min-width:300px}.hero-text h1{font-size:clamp(40px,7vw,68px);font-weight:600;line-height:1}
.lede{font-size:clamp(18px,2.4vw,24px);color:#9A7D1E;font-style:italic;margin:10px 0 14px}
.hero-cover{flex:0 0 320px;max-width:340px}.hero-cover img{width:100%;border-radius:14px;box-shadow:0 20px 50px rgba(34,43,109,.22)}
.hero-cta{margin-top:22px;display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-block;background:var(--navy);color:#fff;text-decoration:none;padding:12px 24px;border-radius:30px;font-weight:500}
.btn:hover{background:#1a2256}.btn-ghost{background:transparent;color:var(--navy);border:1.5px solid var(--navy)}
.btn-buy{background:var(--gold);color:#3a2e06}.btn-buy:hover{background:#b8922178}.btn-soon{background:var(--sage);color:#26331c}
.books{padding:54px 0}.books h2,.vocab h2,.newsletter h2,.prose h1{font-size:clamp(26px,4vw,38px);font-weight:600;margin-bottom:8px}
.lang-group{margin-top:30px}.lang-h{color:var(--gold);font-size:14px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px;border-bottom:1px solid #E7D7A6;padding-bottom:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px}
.card{text-decoration:none;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 26px rgba(34,43,109,.1);transition:transform .15s,box-shadow .15s;display:block}
.card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(34,43,109,.18)}
.card-cover{aspect-ratio:1/1;background:var(--cream)}.card-cover img{width:100%;height:100%;object-fit:cover;display:block}
.cover-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--sage),var(--cream));color:var(--navy);font-weight:600;font-size:20px}
.card-body{padding:14px 16px 18px}.card-body h3{font-size:19px;font-weight:600;margin:6px 0 2px}
.badge{display:inline-block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;padding:3px 10px;border-radius:20px}
.badge-available{background:#E8F3EA;color:#1a7f37}.badge-coming_soon{background:#FBF3DA;color:#9A7D1E}.badge-in_production{background:#EDEBF5;color:#4a4e66}
.book-hero{background:var(--cream);padding:48px 0}.book-grid{display:flex;gap:40px;flex-wrap:wrap;align-items:flex-start}
.book-cover{flex:0 0 360px;max-width:380px}.book-cover img{width:100%;border-radius:14px;box-shadow:0 20px 50px rgba(34,43,109,.22)}
.book-cover .cover-ph{aspect-ratio:1/1;border-radius:14px}
.book-info{flex:1;min-width:300px}.book-info h1{font-size:clamp(30px,5vw,46px);font-weight:600;line-height:1.05;margin-top:8px}
.title-am{font-family:'Noto Sans Ethiopic',serif;color:#9A7D1E;font-weight:700;font-size:22px;margin-top:4px}
.meta{color:#7d7a6c;font-size:15px;margin:10px 0 14px}.book-cta{margin-top:22px}
.vocab{padding:48px 0}.v-table{border-collapse:collapse;width:100%;max-width:560px}
.v-table th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#8A8676;font-weight:600;padding:8px 12px;border-bottom:2px solid #E7D7A6;text-align:left}
.v-table td{padding:11px 12px;border-bottom:1px solid #F1EADB;font-size:19px}
.v-en{font-weight:500}.v-tr{color:#9A7D1E;font-style:italic}.v-am{font-family:'Noto Sans Ethiopic',serif;font-weight:700;font-size:24px}
.prose{padding:48px 0}.prose p{margin:14px 0}.prose h2{font-size:24px;margin-top:28px}
.newsletter{background:var(--navy);color:#fff;padding:50px 0;text-align:center}.newsletter h2{color:#fff}.newsletter .muted{color:#b9bdd6}
.nl-form{display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap}
.nl-form input{padding:12px 16px;border-radius:30px;border:none;min-width:260px;font-family:inherit}
.nl-form button{background:var(--gold);color:#3a2e06;border:none;padding:12px 26px;border-radius:30px;font-weight:600;cursor:pointer;font-family:inherit}
.footer{text-align:center;padding:40px 24px;color:#7d7a6c}.footer .stars{font-size:24px}.footer p{margin:4px 0}
@media(max-width:640px){.hero .wrap,.book-grid{flex-direction:column}.book-cover{flex-basis:auto;max-width:320px}}`;

// ---- build -------------------------------------------------------------------
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (e) { console.warn(`note: could not fully clean ${path.relative(ROOT, OUT)} (${e.code}); building over existing files.`); }
fs.mkdirSync(OUT, { recursive: true });

const books = findBooks(path.join(ROOT, "content")).map(loadBook).sort((a, b) => a.order - b.order);

fs.writeFileSync(path.join(OUT, "styles.css"), css);
fs.writeFileSync(path.join(OUT, "index.html"), homePage(books));
fs.mkdirSync(path.join(OUT, "about"), { recursive: true });
fs.writeFileSync(path.join(OUT, "about", "index.html"), aboutPage());

for (const b of books) {
  const dest = path.join(OUT, "books", b.langCode, b.slug);
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, "index.html"), bookPage(b));
  if (b.cover) fs.copyFileSync(b.cover, path.join(dest, "cover.png"));
}

// sitemap + robots
const urls = ["/", "/about/", ...books.map((b) => b.url)];
fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`Built Kokeba site → ${path.relative(ROOT, OUT)}`);
console.log(`  ${books.length} book page(s): ${books.map((b) => `${b.slug} [${b.status}]`).join(", ")}`);
console.log(`  pages: / , /about/ , ${books.map((b) => b.url).join(" , ")}`);
console.log(`  + sitemap.xml, robots.txt, styles.css`);
console.log(`  base_url: ${BASE}  (set it in apps/site/site.config.json before deploying)`);
