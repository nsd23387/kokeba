"use client";
import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type Vocab = { am: string; translit: string; en: string };
type Page = {
  page: string; image?: string | null; english?: string;
  interaction?: string; vocab?: Vocab; title_en?: string; title_am?: string;
};

export default function ReviewPage({ params }: { params: { bookId: string } }) {
  const bookId = params.bookId;
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState<Page[]>([]);
  const [streaming, setStreaming] = useState(true);
  const [gate1, setGate1] = useState<string>("pending");

  // review form state
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState({ leopard: false, hippo: false });
  const [checks, setChecks] = useState({ fidel: false, dialect: false, cultural: false, original: false });
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const es = new EventSource(`${API}/api/books/${bookId}/proof-stream`);
    es.addEventListener("meta", (e: MessageEvent) => {
      const m = JSON.parse(e.data); setTotal(m.total); setTitle(m.title);
    });
    es.addEventListener("page", (e: MessageEvent) => {
      const { page } = JSON.parse(e.data);
      if (seen.current.has(page.page)) return;
      seen.current.add(page.page);
      setPages((p) => [...p, page]);
    });
    es.addEventListener("done", () => { setStreaming(false); es.close(); });
    es.onerror = () => { setStreaming(false); es.close(); };
    return () => es.close();
  }, [bookId]);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/books/${bookId}`).then((x) => x.json());
        setGate1(r.book?.stages?.gate1 || "pending");
      } catch {}
    };
    poll(); const t = setInterval(poll, 2500); return () => clearInterval(t);
  }, [bookId]);

  const vocabPages = pages.filter((p) => p.vocab);
  const allChecks = Object.values(checks).every(Boolean) && flags.leopard && flags.hippo;

  async function submit(decision: "approve" | "return") {
    const payload = { decision, corrections, flags, cultural_ok: allChecks, checks, notes };
    const r = await fetch(`${API}/api/books/${bookId}/gate1`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    }).then((x) => x.json());
    if (r.blocked) { setResult(`⚠ Blocked — ${r.reason}`); return; }
    setGate1(r.book?.stages?.gate1 || (decision === "approve" ? "done" : "pending"));
    setResult(decision === "approve" ? "Gate 1 approved — advancing to compliance." : "Returned for changes — illustration & layout reopened.");
  }

  return (
    <div className="min-h-screen">
      <header className="bg-navy text-white px-6 py-3 flex items-center gap-3 sticky top-0 z-20">
        <span className="text-gold text-xl">★</span>
        <h1 className="text-lg font-medium">Kokeba Studio</h1>
        <span className="text-sm/none opacity-80 ml-1">· Review &amp; Gates</span>
        <span className="ml-auto text-sm opacity-90">{title || bookId}</span>
        <span className={`ml-3 text-xs font-semibold px-3 py-1 rounded-full ${gate1 === "done" ? "bg-emerald-500" : "bg-purple-500"}`}>
          Gate 1: {gate1 === "done" ? "approved" : gate1.replace("_", " ")}
        </span>
      </header>

      {streaming && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>Assembling proof… {pages.length}/{total || "…"}</span>
            <div className="flex-1 h-1.5 bg-line rounded overflow-hidden">
              <div className="h-full bg-gold transition-all" style={{ width: `${total ? (100 * pages.length) / total : 5}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 p-6 max-w-[1240px] mx-auto items-start">
        {/* proof feed */}
        <div className="flex flex-col gap-5">
          {pages.map((p) => <Spread key={p.page} bookId={bookId} p={p} />)}
          {streaming && <SkeletonSpread />}
        </div>

        {/* Gate 1 panel */}
        <aside className="lg:sticky lg:top-20 bg-white border border-line rounded-xl p-5 flex flex-col gap-5">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-muted mb-1">Gate 1 — native-speaker review</h2>
            <p className="text-sm text-muted">English is final. Confirm the Amharic (fidel + transliteration), resolve the flags, and sign off on cultural accuracy.</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-red-800 mb-2">Priority flags — resolve first</div>
            <label className="flex gap-2 items-start mb-2">
              <input type="checkbox" checked={flags.leopard} onChange={(e) => setFlags({ ...flags, leopard: e.target.checked })} className="mt-1" />
              <span>Leopard uses <span className="font-fidel font-bold">ነብር</span> (nebir) — variant ነብሮ exists and ነብር can mean “tiger.” Confirm.</span>
            </label>
            <label className="flex gap-2 items-start">
              <input type="checkbox" checked={flags.hippo} onChange={(e) => setFlags({ ...flags, hippo: e.target.checked })} className="mt-1" />
              <span>Hippo uses <span className="font-fidel font-bold">ጉማሬ</span> (gumare) — spelling variant exists. Confirm.</span>
            </label>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted mb-2">Confirm / correct each word</div>
            <div className="flex flex-col gap-2">
              {vocabPages.length === 0 && <p className="text-sm text-muted">Words appear as the proof streams in…</p>}
              {vocabPages.map((p) => (
                <div key={p.page} className="flex items-center gap-2">
                  <span className="font-fidel font-bold text-navy text-lg w-20">{p.vocab!.am}</span>
                  <span className="text-xs text-muted w-20">{p.vocab!.translit} · {p.vocab!.en}</span>
                  <input
                    defaultValue={p.vocab!.am}
                    onChange={(e) => setCorrections({ ...corrections, [p.page]: e.target.value })}
                    className="flex-1 font-fidel border border-line rounded px-2 py-1 text-base"
                    aria-label={`correct ${p.vocab!.en}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted mb-2">Cultural sign-off</div>
            {([["fidel", "Fidel spelling correct"], ["dialect", "Dialect natural for a 0–3 read-aloud"], ["cultural", "Culturally appropriate & inclusive"], ["original", "Story is original (not derivative)"]] as const).map(([k, label]) => (
              <label key={k} className="flex gap-2 items-center text-sm py-1">
                <input type="checkbox" checked={(checks as any)[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reviewer notes / changes requested…"
            className="border border-line rounded-lg p-2 text-sm min-h-[64px]" />

          {result && <div className="text-sm rounded-lg p-2 bg-emerald-50 text-emerald-800 border border-emerald-200">{result}</div>}

          <div className="flex gap-2">
            <button onClick={() => submit("approve")} disabled={!allChecks || gate1 === "done"}
              className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40">
              {gate1 === "done" ? "Approved ✓" : "Approve Gate 1"}
            </button>
            <button onClick={() => submit("return")} disabled={gate1 === "done"}
              className="rounded-lg py-2 px-3 text-sm border border-line disabled:opacity-40">Return for changes</button>
          </div>
          {!allChecks && gate1 !== "done" && <p className="text-xs text-muted -mt-2">Resolve both flags and all sign-off checks to approve.</p>}
        </aside>
      </div>
    </div>
  );
}

function Spread({ bookId, p }: { bookId: string; p: Page }) {
  if (p.page === "cover") return <CoverCard bookId={bookId} p={p} />;
  if (!p.image) return (
    <div className="fadein bg-page border border-line rounded-xl p-10 text-center font-story text-navy text-xl">
      <div className="text-gold text-2xl mb-2">★</div>{p.english}
    </div>
  );
  return (
    <div className="fadein flex gap-2 bg-[#C9BFA6] p-2.5 rounded-2xl">
      <div className="w-1/2 aspect-square bg-page rounded-lg flex flex-col items-center justify-center text-center px-[9%] font-story">
        <div className="text-gold text-2xl mb-3">★</div>
        <div className="text-navy font-medium leading-relaxed whitespace-pre-line text-[clamp(15px,1.6vw,22px)]">{p.english}</div>
        {p.interaction && <div className="mt-5 italic text-golddark border border-gold/60 bg-[#FBF3DA] rounded-full px-4 py-1.5 text-sm">{p.interaction}</div>}
      </div>
      <Art bookId={bookId} p={p} />
    </div>
  );
}

function Art({ bookId, p }: { bookId: string; p: Page }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="w-1/2 aspect-square rounded-lg overflow-hidden relative bg-page">
      {!loaded && <div className="absolute inset-0 shimmer" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${API}/api/art/${bookId}/${p.image}`} alt={p.vocab?.en || p.page}
        onLoad={() => setLoaded(true)} className={`w-full h-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} />
      {p.vocab && (
        <div className="absolute left-0 right-0 bottom-0 bg-page/95 flex flex-col items-center py-2">
          <span className="font-fidel font-bold text-navy text-[clamp(22px,3vw,36px)] leading-none">{p.vocab.am}</span>
          <span className="italic text-gold text-sm">{p.vocab.translit}</span>
          <span className="text-muted text-xs">{p.vocab.en}</span>
        </div>
      )}
    </div>
  );
}

function CoverCard({ bookId, p }: { bookId: string; p: Page }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="fadein relative rounded-2xl overflow-hidden aspect-square max-w-[560px] mx-auto border border-line">
      {!loaded && <div className="absolute inset-0 shimmer" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${API}/api/art/${bookId}/${p.image}`} alt="cover" onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`} />
      <div className="absolute left-[9%] right-[9%] top-[6%] text-center bg-page/90 border border-gold/55 rounded-2xl py-3 px-4">
        <div className="text-gold text-lg leading-none">★</div>
        <div className="text-navy font-story font-medium text-[clamp(22px,3.4vw,38px)] leading-tight">{p.title_en}</div>
        <div className="h-0.5 w-12 bg-gold mx-auto my-2" />
        <div className="font-fidel font-bold text-golddark text-[clamp(16px,2.2vw,24px)]">{p.title_am}</div>
      </div>
    </div>
  );
}

function SkeletonSpread() {
  return (
    <div className="flex gap-2 bg-[#C9BFA6] p-2.5 rounded-2xl">
      <div className="w-1/2 aspect-square rounded-lg shimmer" />
      <div className="w-1/2 aspect-square rounded-lg shimmer" />
    </div>
  );
}
