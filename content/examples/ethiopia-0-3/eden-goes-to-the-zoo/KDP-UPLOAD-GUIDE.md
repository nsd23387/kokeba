# Eden Goes to the Zoo — KDP Upload Guide (Paperback + Kindle)

This is the test launch: Amazon KDP **paperback** + **Kindle eBook**. Follow the fields below; the values are ready to paste. Items marked **[YOU]** need your input.

---

## 0. Before you start — what's ready vs. what you provide

**Ready (built by the pipeline):**
- Interior PDF: `Eden Goes to the Zoo - interior.pdf` (28 pages, 8.5×8.5″, full bleed, ≥300 DPI)
- Cover PDF: `Eden Goes to the Zoo - cover.pdf` (full wrap, computed spine)
- Kindle file: `book.epub` (fixed-layout, with alt-text + accessibility metadata)

**You provide:**
- **[YOU] Author / imprint name** (goes on the cover credit + KDP contributor field + copyright). I can't invent this.
- **[YOU] List price** for each format.
- **[OPTIONAL but recommended] Amharic native-reviewer name** — you chose to proceed without for now; the vocab is the heart of the book, so a native pass before or shortly after launch is wise.

**Before uploading, on your machine, regenerate the listing + re-export so the description fix lands:**
```
cd ~/Documents/kokeba
npm run listing content/examples/ethiopia-0-3/eden-goes-to-the-zoo
npm run export:pdf content/examples/ethiopia-0-3/eden-goes-to-the-zoo
```

---

## 1. Paperback — KDP "Create Paperback"

### Details tab
| Field | Value |
|---|---|
| Language | English |
| Book Title | `Eden Goes to the Zoo` |
| Subtitle | `A First-Words Amharic & English Story for Ages 2–5` |
| Series | (leave blank for now) |
| Edition number | `1` |
| Author (Primary) | **[YOU]** your name / pen name |
| Contributors | (optional) add illustrator/translator if crediting |
| Description | paste the description in §3 |
| Publishing rights | "I own the copyright…" |
| Reading age | **2 – 5** |
| Keywords (7) | paste the 7 in §4 |
| Categories | choose the 3 in §5 |

### Content tab
| Setting | Value |
|---|---|
| ISBN | **Get a free KDP ISBN** (you chose this) |
| Print options | Paperback, **full color**, white paper |
| Trim size | **8.5 × 8.5 in** (square) |
| Bleed | **Bleed (PDF has 0.125″ bleed)** |
| Cover finish | Glossy (recommended for kids' books) |
| Manuscript | upload `Eden Goes to the Zoo - interior.pdf` |
| Cover | upload `Eden Goes to the Zoo - cover.pdf` |

Then run KDP's **Print Previewer** and fix any flags before approving.

---

## 2. Kindle eBook — KDP "Create eBook"

Reuse the same Details (title, subtitle, author, description, keywords, categories, reading age).

| Setting | Value |
|---|---|
| Manuscript | upload `book.epub` |
| Format | Fixed-layout (the EPUB is already fixed-layout) |
| Cover | KDP can pull from the EPUB, or upload the front cover image |
| DRM | your choice |
| KDP Select | optional (90-day Amazon exclusivity for extra promo tools) |

---

## 3. Description (paste into both)

> **Eden Goes to the Zoo** is a warm, inclusive picture book for ages 2–5 that pairs an everyday adventure with first words in Amharic.
>
> Join Eden and her mama on a joyful trip to meet a lion, elephant, monkey, giraffe, camel, hippo, and leopard — each page shares one Amharic word (in fidel script with a simple pronunciation) to read aloud together. A gentle, repetitive, call-and-response story made for the very youngest readers.
>
> - **Bilingual:** an English story carrying Amharic heritage words
> - **Ages 2–5,** designed for read-aloud
> - **Celebrates Ethiopian heritage,** inclusive of every family

---

## 4. Backend keywords (7 — ranked by live Amazon volume)

Paste one per keyword box:

1. `amharic alphabet`
2. `learn amharic`
3. `bilingual books for kids`
4. `amharic books for kids`
5. `amharic book`
6. `bilingual books for toddlers`
7. `multicultural childrens books`

---

## 5. Categories (pick 3 at setup; BISAC-based)

- **JUVENILE FICTION › Animals**
- **JUVENILE FICTION › Concepts › Words**
- **JUVENILE FICTION › People & Places › Africa**

---

## 6. Pricing — **[YOU]**

Full-color paperbacks have a higher printing cost, so KDP enforces a minimum list price. During setup KDP shows your **exact printing cost** and **minimum price** for the 8.5×8.5 / 28-page / color spec, then your royalty at any price.

- These are factual mechanics, not a recommendation: color kids' paperbacks commonly list around **$9.99–$14.99**; Kindle kids' titles often **$2.99–$5.99**.
- Set the price where the royalty and the shopper's expectation both feel right to you — KDP's calculator on the pricing page is the source of truth.

---

## 7. After it's live

- Order an **author proof copy** to check color + binding in hand before promoting.
- Do the **Amharic native review** if not yet done; corrections can be re-uploaded.
- Watch the first weeks of search placement against the keywords, then iterate.
- The data already says your **next book is an Amharic Alphabet Book** (high demand, low competition) — the scout seeded it.
