"use client";
import { useEffect, useRef, useState } from "react";
import { Setup, Script, CallRecord, Score, Line, buildScripts, coach, defaultTips, ruleScore, Tip } from "@/lib/core";
import { INDUSTRIES, DEFAULT_INDUSTRY, getIndustry, scenarioOf } from "@/lib/industries";

type View = "landing" | "onboard" | "call" | "dashboard";
type Cfg = { live: boolean; outbound?: boolean; inbound?: boolean; inboundNumber?: string | null; llm: boolean };
const KEY = "callcheck.history.v2";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fresh = (industry: string, phone = "(555) 010-0199"): Setup => {
  const ind = getIndustry(industry);
  return { industry: ind.id, biz: ind.biz, phone, values: Object.fromEntries(ind.fields.map(f => [f.key, f.value])), scenario: ind.scenarios[0].id, bizType: "", questions: "" };
};

// Sample scorecard for the landing page, built from the demo data with the rule-based scorer.
const SAMPLE = (() => {
  const setup = fresh(DEFAULT_INDUSTRY);
  const script = buildScripts(setup)[1];
  return { setup, script, score: ruleScore(setup, script) };
})();

const wrap = "max-w-[1080px] mx-auto px-5 sm:px-8";
const btn = "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const btnPrimary = `${btn} bg-accent text-white hover:bg-accent-dark`;
const btnGhost = `${btn} bg-white text-ink ring-1 ring-inset ring-line hover:bg-canvas`;
const card = "bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
const eyebrow = "text-[13px] font-semibold text-accent";
const sectionTitle = "text-[17px] font-semibold tracking-tight";

function Logo() {
  return <span className="hidden min-[360px]:grid place-items-center h-7 w-7 rounded-lg bg-accent text-white" aria-hidden>
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.3 5.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2" /><path d="m14 6 2 2 4-4" />
    </svg></span>;
}

function ModeTag({ live }: { live: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap ${live ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-accent" : "bg-warn"}`} /><span>{live ? "Live" : "Demo"}<span className="hidden sm:inline"> {live ? "call" : "mode"}</span></span></span>;
}

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [cfg, setCfg] = useState<Cfg>({ live: false, llm: false });
  const [setup, setSetup] = useState<Setup>(() => fresh(DEFAULT_INDUSTRY));
  const [useLive, setUseLive] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"inbound" | "outbound">("inbound");
  const [consent, setConsent] = useState(false);
  const [history, setHistory] = useState<CallRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
    fetch("/api/config").then(r => r.json()).then(c => { setCfg(c); setKind(c.inbound ? "inbound" : "outbound"); }).catch(() => {});
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  const live = cfg.live && useLive && !!code;
  const addRecord = (rec: CallRecord) => setHistory(h => { const n = [rec, ...h]; localStorage.setItem(KEY, JSON.stringify(n)); return n; });
  const navItem = (v: View, label: string) => <button onClick={() => setView(v)} aria-current={view === v ? "page" : undefined} className={`text-sm whitespace-nowrap transition-colors ${view === v ? "text-ink font-medium" : "text-muted hover:text-ink"}`}>{label}</button>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-black/[0.06]">
        <div className={`${wrap} h-14 flex items-center justify-between gap-4`}>
          <button onClick={() => setView("landing")} className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"><Logo />CallCheck</button>
          <nav className="flex items-center gap-3 min-[360px]:gap-4 sm:gap-6">
            {navItem("onboard", "New test")}{navItem("dashboard", "Dashboard")}
            <ModeTag live={live} />
          </nav>
        </div>
      </header>
      <div className={`flex-1 ${view === "landing" ? "bg-white" : "bg-canvas"}`}>
        {view === "landing" && <Landing go={() => setView("onboard")} />}
        {view === "onboard" && <Onboard {...{ setup, setSetup, consent, setConsent, cfg, useLive, setUseLive, live, code, setCode, kind, setKind }} go={() => setView("call")} />}
        {view === "call" && <LiveCall live={live} code={code} kind={kind} cfg={cfg} setup={setup} consent={consent} back={() => setView("onboard")} onDone={(rec) => { addRecord(rec); setSelected(rec.id); setView("dashboard"); }} />}
        {view === "dashboard" && <Dashboard history={history} selected={selected} setSelected={setSelected} clear={() => { setHistory([]); localStorage.setItem(KEY, "[]"); }} newTest={() => setView("onboard")} />}
      </div>
      <footer className="bg-canvas border-t border-black/[0.06]">
        <div className={`${wrap} py-6 text-xs text-muted flex flex-col sm:flex-row gap-1 sm:justify-between`}><span>CallCheck · prototype</span><span>Sample data only. No real businesses.</span></div>
      </footer>
    </div>
  );
}

/* ---------- Shared pieces ---------- */

const gradeTone = (g: string) => /^[AB]/.test(g) ? "text-accent bg-accent-soft" : g.startsWith("C") ? "text-warn bg-warn-soft" : "text-bad bg-bad-soft";
const barTone = (n: number) => n >= 8 ? "bg-accent" : n >= 5 ? "bg-warn" : "bg-bad";

function Grade({ grade, size = "lg" }: { grade: string; size?: "lg" | "sm" }) {
  return <span className={`grid place-items-center rounded-full font-semibold tracking-tight shrink-0 ${gradeTone(grade)} ${size === "lg" ? "h-24 w-24 text-[44px]" : "h-10 w-10 text-lg"}`}>{grade}</span>;
}

function Bars({ cats }: { cats: [string, number, string][] }) {
  return <div className="space-y-4">{cats.map(([k, v, good]) => (
    <div key={k} title={good}>
      <div className="flex justify-between gap-3 text-[15px]"><span>{k}</span><span className="tnum font-semibold">{v}<span className="text-muted font-normal"> / 10</span></span></div>
      <div className="h-1.5 rounded-full bg-black/[0.06] mt-2 overflow-hidden"><div className={`h-full rounded-full ${barTone(v)}`} style={{ width: `${v * 10}%` }} /></div>
    </div>))}</div>;
}

const catsOf = (s: Score, industry: string): [string, number, string][] => {
  const rb = getIndustry(industry).rubric;
  return [["Answer speed", s.answerSpeed, "Picked up within three rings."], [rb.greeting[0], s.greeting, rb.greeting[1]], [rb.accuracy[0], s.accuracy, rb.accuracy[1]], [rb.booking[0], s.booking, rb.booking[1]]];
};

function Transcript({ lines }: { lines: Line[] }) {
  return <div className="space-y-3">{lines.map((l, i) => {
    const staff = l.who === "Staff";
    return <div key={i} className={`fade-in flex ${staff ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className={`text-[11px] font-semibold mb-1 px-1 ${staff ? "text-accent" : "text-muted text-right"}`}>{staff ? "Staff" : "Caller"}</div>
        <div className={`px-4 py-2.5 rounded-[20px] text-[15px] leading-snug ${staff ? "bg-canvas text-ink rounded-tl-md" : "bg-accent text-white rounded-tr-md"}`}>{l.text}</div>
      </div>
    </div>;
  })}</div>;
}

/* ---------- Landing ---------- */

function Landing({ go }: { go: () => void }) {
  const rows: [string, string, string][] = [
    ["Cost per call", "≈ $9.75", "$25–69"],
    ["Setup fee", "None", "Usually"],
    ["Turnaround", "Minutes", "Days"],
    ["Full transcript", "Every call", "Rarely"],
  ];
  const graded: [string, string, JSX.Element][] = [
    ["Answer speed", "Rings before a person picks up.", <path key="a" d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />],
    ["Greeting", "Business name, a name, an offer to help.", <path key="g" d="M7 9h10M7 13h6m-9 7 2.5-3H19a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14" />],
    ["Accuracy", "Hours, prices and specials checked against what you entered.", <path key="c" d="m5 13 4 4L19 7" />],
    ["Booking", "Whether staff asked for the appointment.", <path key="b" d="M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />],
  ];
  const s = SAMPLE.score;
  return (
    <main className="fade-in">
      <section className={`${wrap} pt-16 sm:pt-24 pb-12 text-center`}>
        <p className={eyebrow}>Phone mystery shopping</p>
        <h1 className="mt-3 mx-auto max-w-[880px] text-[40px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.03em] text-balance">Find out how your phone is answered when you're not there.</h1>
        <p className="mt-6 mx-auto max-w-[640px] text-[17px] sm:text-xl leading-relaxed text-muted text-balance">CallCheck calls your business as an ordinary customer, then grades the call and coaches your team: how fast staff picked up, how they greeted, whether the facts were right, and whether they offered a time. Set up for dealerships, salons, restaurants, clinics and home services.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={go} className={btnPrimary}>Run a test call</button>
          <a href="#graded" className={btnGhost}>How calls are graded</a>
        </div>
        <p className="mt-4 text-sm text-muted">Takes about two minutes.</p>
      </section>

      <section className={`${wrap} pb-20 sm:pb-28`} aria-label="Sample scorecard">
        <div className="mx-auto max-w-[860px] rounded-[28px] bg-canvas p-3 sm:p-5">
          <div className={card + " overflow-hidden"}>
            <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-black/[0.06]">
              <div className="min-w-0"><div className="text-xs text-muted">Sample scorecard · demo data</div><div className="font-semibold truncate">{SAMPLE.setup.biz}</div></div>
              <ModeTag live={false} />
            </div>
            <div className="grid sm:grid-cols-[200px_1fr] gap-6 sm:gap-8 p-5 sm:p-7">
              <div className="flex sm:flex-col items-center sm:items-start gap-4">
                <Grade grade={s.grade} />
                <div><div className="text-sm text-muted">Overall</div><div className="tnum text-2xl font-semibold">{s.overall}<span className="text-muted text-base font-normal"> / 10</span></div></div>
              </div>
              <Bars cats={catsOf(s, SAMPLE.setup.industry)} />
            </div>
            <div className="px-5 sm:px-7 py-4 bg-canvas/60 border-t border-black/[0.06] text-[15px]"><span className="font-semibold">Top fix: </span><span className="text-muted">{s.fixes[0]}</span></div>
          </div>
        </div>
      </section>

      <section id="graded" className="bg-canvas py-20 sm:py-24 scroll-mt-14">
        <div className={wrap}>
          <h2 className="text-center text-[32px] sm:text-[44px] font-semibold tracking-[-0.025em] text-balance">Every call is graded on four things.</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {graded.map(([t, d, icon]) => (
              <div key={t} className={card + " p-6"}>
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-accent-soft text-accent">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{icon}</svg>
                </span>
                <h3 className="mt-5 text-[19px] font-semibold tracking-tight">{t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{d}</p>
              </div>))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className={wrap}>
          <h2 className="text-center text-[32px] sm:text-[44px] font-semibold tracking-[-0.025em]">Simple pricing.</h2>
          <div className={card + " mt-10 mx-auto max-w-[560px] p-6 sm:p-8"}>
            <div className="flex items-baseline justify-between"><span className="text-[17px] font-semibold">Starter</span><span className="text-sm text-muted">Monthly</span></div>
            <div className="mt-3 flex items-baseline gap-1.5"><span className="text-[56px] font-semibold leading-none tracking-tight tnum">$39</span><span className="text-muted">/ month</span></div>
            <p className="mt-2 text-[15px] text-muted">Four test calls a month, each with a scorecard and transcript.</p>
            <table className="w-full mt-6 text-[15px]">
              <thead><tr className="text-left text-muted border-b border-black/[0.08]"><th className="font-normal pb-2"><span className="sr-only">Feature</span></th><th className="font-semibold text-ink pb-2">CallCheck</th><th className="font-normal pb-2">Human shopper</th></tr></thead>
              <tbody>{rows.map(([a, b, c]) => <tr key={a} className="border-b border-black/[0.06] last:border-0"><td className="py-3 text-muted">{a}</td><td className="py-3 tnum font-medium">{b}</td><td className="py-3 text-muted tnum">{c}</td></tr>)}</tbody>
            </table>
            <p className="mt-3 text-xs text-muted">Human mystery shoppers typically charge $25–69 per call, plus setup.</p>
            <button onClick={go} className={btnPrimary + " w-full mt-6"}>Start with a test call</button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- Setup ---------- */

const inp = "w-full h-11 rounded-xl bg-white px-3.5 text-[15px] ring-1 ring-inset ring-line placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent";
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium">{label}</span>{hint && <span className="text-sm text-muted"> · {hint}</span>}<div className="mt-1.5">{children}</div></label>;
}
const choice = (on: boolean) => `block rounded-xl p-4 cursor-pointer transition-colors ring-inset ${on ? "ring-2 ring-accent bg-accent-soft/60" : "ring-1 ring-line hover:bg-canvas"}`;

function Onboard(p: { setup: Setup; setSetup: (s: Setup) => void; consent: boolean; setConsent: (b: boolean) => void; cfg: Cfg; useLive: boolean; setUseLive: (b: boolean) => void; live: boolean; code: string; setCode: (c: string) => void; kind: "inbound" | "outbound"; setKind: (k: "inbound" | "outbound") => void; go: () => void }) {
  const { setup, setSetup, consent, setConsent, cfg, useLive, setUseLive, live, code, setCode, kind, setKind, go } = p;
  const [draft, setDraft] = useState(""); const [codeErr, setCodeErr] = useState("");
  const unlock = async () => { const r = await fetch("/api/unlock", { method: "POST", headers: { "x-live-code": draft.trim() } }); if (r.ok) { setCode(draft.trim()); setCodeErr(""); } else setCodeErr("That code isn't valid."); };
  const ind = getIndustry(setup.industry);
  const isCustom = ind.id === "custom";
  const val = (k: string) => (e: any) => setSetup({ ...setup, values: { ...setup.values, [k]: e.target.value } });
  const ok = consent && setup.biz && (setup.phone || (live && kind === "inbound")) && (!isCustom || (setup.questions || "").trim());
  return (
    <main className="max-w-[720px] mx-auto px-5 sm:px-8 py-12 sm:py-16 fade-in">
      <div className="flex items-center justify-between gap-3"><p className={eyebrow}>New test call</p><ModeTag live={live} /></div>
      <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.025em] mt-2">Set up the call</h1>
      <p className="text-muted mt-2 text-[17px]">Enter what staff should tell a customer. The call is graded against these facts.</p>

      <div className="mt-8 space-y-4">
        <section className={card + " p-5 sm:p-6"}>
          <h2 className={sectionTitle}>Business</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Industry">
              <select id="industry" className={inp} value={setup.industry} onChange={e => setSetup({ ...fresh(e.target.value, setup.phone) })}>
                {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select></Field></div>
            <Field label="Business name"><input name="biz" className={inp} value={setup.biz} onChange={e => setSetup({ ...setup, biz: e.target.value })} /></Field>
            <Field label="Phone number"><input name="phone" inputMode="tel" className={inp} value={setup.phone} onChange={e => setSetup({ ...setup, phone: e.target.value })} /></Field>
            {isCustom && <div className="sm:col-span-2"><Field label="Business type"><input name="bizType" className={inp} value={setup.bizType} placeholder="e.g. bike repair shop" onChange={e => setSetup({ ...setup, bizType: e.target.value })} /></Field></div>}
          </div>
          <h3 className="mt-6 text-sm font-semibold text-muted">What staff should say</h3>
          <div className="mt-3 grid sm:grid-cols-2 gap-4">
            {ind.fields.map(f => <Field key={f.key} label={f.label} hint={f.hint}><input name={f.key} className={inp} value={setup.values[f.key] ?? ""} onChange={val(f.key)} /></Field>)}
          </div>
        </section>

        <section className={card + " p-5 sm:p-6"}>
          {isCustom ? <Field label="Questions the caller should ask" hint="one per line">
            <textarea name="questions" className={inp + " h-auto py-2.5"} rows={3} placeholder={"Do you do tune-ups on weekends?\nWhat does a basic tune-up cost?"} value={setup.questions} onChange={e => setSetup({ ...setup, questions: e.target.value })} /></Field>
          : <>
            <h2 className={sectionTitle}>Scenario</h2>
            <div className="mt-4 grid gap-2.5">
              {ind.scenarios.map(s => (
                <label key={s.id} data-scenario={s.id} className={choice(setup.scenario === s.id) + " flex items-center gap-3 text-[15px]"}>
                  <input type="radio" name="scenario" className="h-4 w-4 accent-[#0B7A4B]" checked={setup.scenario === s.id} onChange={() => setSetup({ ...setup, scenario: s.id })} />{s.label}
                </label>))}
            </div></>}
          <div className="mt-4 text-xs text-muted">Graded on: Answer speed · {ind.rubric.greeting[0]} · {ind.rubric.accuracy[0]} · {ind.rubric.booking[0]}</div>
        </section>

        {cfg.live && <section className={card + " p-5 sm:p-6"}>
          <h2 className={sectionTitle}>Mode</h2>
          <div className="mt-4 inline-flex p-1 rounded-full bg-canvas text-sm">
            {[["live", "Live call"], ["demo", "Demo"]].map(([k, l]) => <button key={k} data-mode={k} onClick={() => setUseLive(k === "live")} className={`px-4 h-8 rounded-full font-medium transition-colors ${(k === "live") === useLive ? "bg-white shadow-sm text-ink" : "text-muted hover:text-ink"}`}>{l}</button>)}
          </div>
          {useLive && !code && <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1"><Field label="Live access code" hint="required for real calls"><input id="livecode" type="password" className={inp} value={draft} onChange={e => setDraft(e.target.value)} /></Field></div>
            <button onClick={unlock} className={btnGhost}>Unlock</button>
          </div>}
          {useLive && code && <div className="mt-3 text-sm text-accent font-medium">Live calls unlocked for this session.</div>}
          {useLive && <div className="mt-5 grid gap-2.5">
            {cfg.inbound && <label data-kind="inbound" className={choice(kind === "inbound")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><input type="radio" name="kind" className="h-4 w-4 accent-[#0B7A4B]" checked={kind === "inbound"} onChange={() => setKind("inbound")} />
                <span className="text-[15px] font-medium">Call in from the business phone</span><span className="text-xs font-semibold text-accent">Recommended</span></div>
              <div className="pl-7 mt-1 text-sm text-muted">Staff dial <span className="tnum text-ink">{cfg.inboundNumber}</span>. Works from Canada and the US.</div>
            </label>}
            {cfg.outbound && <label data-kind="outbound" className={choice(kind === "outbound")}>
              <div className="flex items-center gap-3"><input type="radio" name="kind" className="h-4 w-4 accent-[#0B7A4B]" checked={kind === "outbound"} onChange={() => setKind("outbound")} />
                <span className="text-[15px] font-medium">We call the business</span></div>
              <div className="pl-7 mt-1 text-sm text-muted">US numbers only for now. Canadian numbers can't be dialed yet; use call-in instead.</div>
            </label>}
          </div>}
          {codeErr && <div className="mt-2 text-sm text-bad">{codeErr}</div>}
        </section>}

        <section className={card + " p-5 sm:p-6"}>
          <label className="flex gap-3 items-start text-[15px] font-medium cursor-pointer">
            <input id="consent" type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#0B7A4B]" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>I agree to test calls and will tell staff that calls may be tested.</span>
          </label>
          <p className="text-sm text-muted leading-relaxed pl-8 mt-2">Only test a number you own or are authorized to manage. Let staff know ahead of time that calls may be tested and recorded. Recording-consent rules vary by province and state.</p>
        </section>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <span className="text-sm text-muted">{!live ? "Demo mode: the call is simulated. No phone call is placed." : kind === "inbound" ? `Next: call ${cfg.inboundNumber} from the business phone.` : "This will place a real outbound call to the number above."}</span>
          <button disabled={!ok} onClick={go} className={btnPrimary + " w-full sm:w-auto"}>Run test call</button>
        </div>
      </div>
    </main>
  );
}

/* ---------- Call ---------- */

type LiveState = { status: string; lines: Line[]; error?: string; number?: string | null };
function LiveCall({ live, code, kind, cfg, setup, consent, onDone, back }: { live: boolean; code: string; kind: "inbound" | "outbound"; cfg: Cfg; setup: Setup; consent: boolean; onDone: (r: CallRecord) => void; back: () => void }) {
  const ind = getIndustry(setup.industry); const sc = scenarioOf(setup);
  const [script] = useState<Script>(() => { const a = buildScripts(setup); return a[Math.floor(Math.random() * a.length)]; });
  const [phase, setPhase] = useState<"dialing" | "ringing" | "connected" | "scoring" | "error">(live ? "dialing" : "ringing");
  const [inboundWait, setInboundWait] = useState(false);
  const [rings, setRings] = useState(0);
  const [shown, setShown] = useState(0);
  const [secs, setSecs] = useState(0);
  const [ls, setLs] = useState<LiveState>({ status: "queued", lines: [] });
  const end = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const findLatest = useRef(false);

  const finish = async (s: Script, extra: Partial<CallRecord>) => {
    setPhase("scoring");
    const score: Score = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json", ...(live ? { "x-live-code": code } : {}) }, body: JSON.stringify({ setup, script: s }) }).then(r => r.json());
    setTimeout(() => onDone({ id: uid(), at: new Date().toISOString(), scenario: sc.label, setup, script: s, score, mode: live ? "live" : "demo", ...extra }), 400);
  };

  const ticking = phase !== "error" && phase !== "scoring";
  useEffect(() => { if (!ticking) return; const t = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(t); }, [ticking]);

  // Live: start the test via the server (PATCH assistant and/or outbound call), poll until it ends, then auto-score and save.
  useEffect(() => {
    if (!live || started.current) return; started.current = true;
    let stop = false;
    (async () => {
      const r = await fetch("/api/call", { method: "POST", headers: { "Content-Type": "application/json", "x-live-code": code }, body: JSON.stringify({ setup, consent, kind }) });
      const j = await r.json().catch(() => ({ error: `Server error ${r.status}` }));
      if (!r.ok) { setLs({ status: "error", lines: [], error: j.error }); setPhase("error"); return; }
      if (j.inbound) { setInboundWait(true); setLs({ status: "waiting", lines: [], number: j.number || cfg.inboundNumber }); }
      let id: string | null = j.id || null;
      // Small slack so a call placed a moment before clicking still counts.
      const since = j.since ? new Date(Date.parse(j.since) - 60000).toISOString() : null;
      let n = 0;
      while (!stop) {
        // Once we know the call id, poll the live transcript every second; check Vapi itself every 4s.
        await new Promise(res => setTimeout(res, id ? 1000 : 2000)); n++;
        if (id && n % 4 !== 0) {
          const lv = await fetch(`/api/call/live?id=${id}`, { headers: { "x-live-code": code } }).then(r => r.ok ? r.json() : null).catch(() => null);
          if (lv?.lines?.length) { setLs(x => lv.lines.length >= x.lines.length ? { ...x, lines: lv.lines } : x); setPhase("connected"); }
          if (!lv?.ended) continue;
        }
        const p = await fetch(id ? `/api/call?id=${id}` : findLatest.current ? `/api/call?latest=1&clicked=${encodeURIComponent(j.since || "")}` : `/api/call?since=${encodeURIComponent(since || "")}&clicked=${encodeURIComponent(j.since || "")}`, { headers: { "x-live-code": code } }).then(r => r.json()).catch(() => null);
        if (!p || p.error || p.status === "waiting") continue;
        id = p.id; setInboundWait(false);
        setLs(x => ({ ...x, status: p.status, lines: p.ended || p.lines.length >= x.lines.length ? p.lines : x.lines }));
        setPhase(p.status === "ringing" || p.status === "queued" ? "ringing" : "connected");
        if (p.ended) {
          stop = true;
          await finish({ id: p.id, quality: "live", rings: p.rings ?? 0, answerSecs: p.answerSecs, lines: p.lines }, { vapiId: p.id, endedReason: p.endedReason, recordingUrl: p.recordingUrl });
        }
      }
    })();
    return () => { stop = true; };
  }, []); // eslint-disable-line

  // Demo: simulated ringing then scripted transcript.
  useEffect(() => {
    if (live || phase !== "ringing") return;
    if (rings >= script.rings) { setPhase("connected"); return; }
    const t = setTimeout(() => setRings(r => r + 1), 550); return () => clearTimeout(t);
  }, [rings, phase, script.rings, live]);
  useEffect(() => {
    if (live || phase !== "connected") return;
    if (shown >= script.lines.length) { finish(script, {}); return; }
    const t = setTimeout(() => setShown(n => n + 1), 900); return () => clearTimeout(t);
  }, [shown, phase]); // eslint-disable-line

  const lines = live ? ls.lines : script.lines.slice(0, shown);
  const label = sc.label;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [lines.length]);
  const mm = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const statusText = phase === "error" ? `Could not start call: ${ls.error}`
    : phase === "dialing" ? (inboundWait ? "Waiting for the test call" : kind === "inbound" ? "Getting the shopper ready…" : "Placing call…")
    : phase === "ringing" ? (live ? `Ringing (${ls.status})` : `Ringing · ${rings}`)
    : phase === "connected" ? (live ? `In progress` : `Connected after ${script.rings} rings`)
    : "Call ended · grading";
  const bannerTone = live && phase === "error" ? "bg-bad-soft text-bad" : live ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn";

  return (
    <main className="max-w-[720px] mx-auto px-5 sm:px-8 py-10 sm:py-14 fade-in">
      {live && inboundWait && <section id="callin" className={card + " mb-6 p-6 sm:p-7"}>
        <p className={eyebrow}>Call this number</p>
        <a href={`tel:${(ls.number || "").replace(/[^\d+]/g, "")}`} className="block text-[36px] sm:text-[48px] font-semibold leading-none tracking-tight mt-3 tnum text-accent">{ls.number}</a>
        <ol className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
          {[["Call from the business phone", "Use the line your staff normally answer from, so the test feels real."], ["The AI shopper talks", `A customer calls ${setup.biz} about: ${sc.label.toLowerCase()}. Answer as you would for any caller.`], ["Hang up for your scorecard", "When the call ends, it's graded here automatically. Keep this page open."]].map(([t, d], i) => (
            <li key={t} className="rounded-xl bg-canvas p-4"><div className="text-xs font-semibold text-accent tnum">Step {i + 1}</div><div className="font-semibold mt-1">{t}</div><p className="text-muted mt-1 leading-relaxed">{d}</p></li>))}
        </ol>
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted">
          <span>Already called and this page didn't pick it up?</span>
          <button data-find-latest onClick={() => { findLatest.current = true; }} className={btnGhost + " h-9"}>Find my latest call</button>
        </div>
      </section>}
      <div className={`mb-4 rounded-2xl px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${bannerTone}`}>
        <span className="font-semibold">{!live ? "Demo mode: simulated call." : phase === "error" ? "The call didn't start." : inboundWait ? "Live test: waiting for your call." : phase === "dialing" ? (kind === "inbound" ? "Getting the shopper ready…" : "Starting the live call…") : phase === "scoring" ? "Call ended." : "Live call in progress."}</span>
        <span className="opacity-80">{!live ? "No real phone call is placed" : phase === "error" ? "Nothing was recorded" : "Recording and transcript on"}</span>
      </div>
      <div className={card + " overflow-hidden"}>
        <div className="px-5 sm:px-6 py-5 border-b border-black/[0.06] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-accent">{label}</div>
            <div className="text-[22px] sm:text-[26px] font-semibold tracking-tight mt-1 truncate">{setup.biz}</div>
            <div className="text-sm text-muted tnum">{ind.label}{setup.phone ? ` · ${setup.phone}` : ""}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="tnum text-[28px] font-semibold tracking-tight" data-testid="timer">{mm}</div>
            <div className="text-xs text-muted flex items-center gap-1.5 justify-end">
              <span className={`h-2 w-2 rounded-full ${phase === "connected" ? "bg-accent" : phase === "error" ? "bg-bad" : "bg-warn blink"}`} /><span className="max-w-[140px] sm:max-w-none">{statusText}</span>
            </div>
          </div>
        </div>
        <div className="h-[420px] overflow-y-auto px-4 sm:px-6 py-5">
          {lines.length === 0 && phase !== "error" && <div className="h-full grid place-items-center text-center text-sm text-muted px-4">{phase === "dialing" ? (inboundWait ? `Waiting for a call to ${ls.number}` : kind === "inbound" ? `Getting a ${ind.label.toLowerCase()} shopper ready for ${setup.biz}. The number appears once Vapi confirms` : "Placing call") : "Waiting for someone to pick up"}<span className="blink">…</span></div>}
          {phase === "error" && <div className="h-full grid place-items-center text-center text-sm"><div><p className="text-bad">{ls.error}</p><button onClick={back} className={btnGhost + " mt-4"}>Back to setup</button></div></div>}
          <Transcript lines={lines} />
          {phase === "scoring" && <div className="text-sm text-muted mt-6 text-center">Grading the call<span className="blink">…</span></div>}
          <div ref={end} />
        </div>
      </div>
    </main>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({ history, selected, setSelected, clear, newTest }: { history: CallRecord[]; selected: string | null; setSelected: (s: string) => void; clear: () => void; newTest: () => void }) {
  const rec = history.find(h => h.id === selected) || history[0];
  if (!rec) return <main className="max-w-[720px] mx-auto px-5 sm:px-8 py-24 text-center fade-in"><h1 className="text-[32px] font-semibold tracking-tight">No calls yet</h1><p className="text-muted mt-2 text-[17px]">Run a test call to see a scorecard here.</p><button onClick={newTest} className={btnPrimary + " mt-6"}>Run a test call</button></main>;
  const s = rec.score;
  const seenC = new Set<string>();
  const coaching = s.fixes.map(f => ({ fix: f, ...coach(f, rec.setup) })).filter(c => !seenC.has(c.title) && seenC.add(c.title));
  const latest = history[0];
  const seen = new Set<string>();
  const top: Tip[] = [...latest.score.fixes.map(f => coach(f, latest.setup)), ...defaultTips(latest.setup)].filter(t => !seen.has(t.title) && seen.add(t.title)).slice(0, 3);
  const mode = rec.mode || "demo";
  return (
    <main className={`${wrap} py-10 sm:py-14 fade-in`}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3"><span className={eyebrow}>Latest scorecard</span><ModeTag live={mode === "live"} /></div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.025em] mt-2">{rec.setup.biz}</h1>
          <p className="text-muted text-sm mt-1">{getIndustry(rec.setup.industry).label} · {rec.scenario} · {new Date(rec.at).toLocaleString()}</p>
        </div>
        <button onClick={newTest} className={btnPrimary + " self-start sm:self-auto"}>New test call</button>
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-8 items-start">
        <div className="space-y-6 min-w-0">
          <section id="scorecard" className={card + " grid sm:grid-cols-[200px_1fr] gap-6 sm:gap-8 p-5 sm:p-7"}>
            <div className="flex sm:flex-col items-center sm:items-start gap-4">
              <Grade grade={s.grade} />
              <div><div className="text-sm text-muted">Overall</div><div className="tnum text-2xl font-semibold">{s.overall}<span className="text-muted text-base font-normal"> / 10</span></div></div>
            </div>
            <div>
              <Bars cats={catsOf(s, rec.setup.industry)} />
              <div className="text-xs text-muted mt-5">Graded by {s.engine === "llm" ? `language model (${s.model || "LLM"})` : "rule-based scorer"} · {mode === "live" ? `live call${rec.endedReason ? `, ended: ${rec.endedReason}` : ""}` : "simulated call"}</div>
            </div>
          </section>
          <section className={card + " p-5 sm:p-7"}>
            <h2 className="text-[21px] font-semibold tracking-tight">What to fix</h2>
            <ol className="mt-4 space-y-3">{s.fixes.map((f, i) => <li key={i} className="flex gap-3 text-[15px]"><span className="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-canvas text-xs font-semibold tnum">{i + 1}</span><span className="pt-0.5">{f}</span></li>)}</ol>
          </section>
          <section id="coaching" className={card + " p-5 sm:p-7"}>
            <h2 className="text-[21px] font-semibold tracking-tight">Coaching</h2>
            <p className="text-sm text-muted mt-1">Each fix as something to practise, with a line staff can use.</p>
            <div className="mt-5 space-y-5">{coaching.map((c, i) => (
              <div key={i}>
                <div className="font-semibold text-[15px]">{c.title}</div><p className="text-sm text-muted mt-1">{c.tip}</p>
                <blockquote className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-[15px] text-accent-dark">“{c.example}”</blockquote>
              </div>))}</div>
          </section>
          <section className={card + " p-5 sm:p-7"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[21px] font-semibold tracking-tight">Transcript</h2>
              <span className="text-xs text-muted">{rec.script.answerSecs != null ? `Answered after ${Math.round(rec.script.answerSecs)}s` : `Picked up after ${rec.script.rings} rings`}{rec.recordingUrl && <> · <a className="underline" href={rec.recordingUrl} target="_blank">Recording</a></>}</span></div>
            <div className="mt-5">{rec.script.lines.length ? <Transcript lines={rec.script.lines} /> : <p className="text-sm text-muted">No one answered.</p>}</div>
          </section>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-20">
          <section id="tips" className={card + " p-5 sm:p-6"}>
            <div className="flex items-baseline justify-between"><h2 className="text-[19px] font-semibold tracking-tight">Practice this week</h2><span className="text-xs font-semibold text-muted">Top 3</span></div>
            <ol className="mt-4 space-y-4">{top.map((t, i) => (
              <li key={i} className="flex gap-3 text-sm"><span className="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-accent-soft text-accent text-xs font-semibold tnum">{i + 1}</span>
                <div className="min-w-0"><div className="font-semibold">{t.title}</div><div className="mt-1 text-accent-dark">“{t.example}”</div></div></li>))}</ol>
            <p className="text-xs text-muted mt-5 border-t border-black/[0.06] pt-3">From the latest scorecard. Read the lines aloud at the start of a shift.</p>
          </section>
          <section className={card + " p-2"}>
            <div className="flex items-baseline justify-between px-3 pt-3 pb-2"><h2 className="text-[19px] font-semibold tracking-tight">History</h2><button onClick={clear} className="text-xs text-muted hover:text-bad">Clear</button></div>
            <ul>{history.map(h => (
              <li key={h.id}><button onClick={() => setSelected(h.id)} aria-current={h.id === rec.id ? "true" : undefined} className={`w-full text-left flex items-center gap-3 rounded-xl p-3 transition-colors ${h.id === rec.id ? "bg-canvas" : "hover:bg-canvas/60"}`}>
                <Grade grade={h.score.grade} size="sm" />
                <span className="min-w-0"><span className="block text-sm font-medium truncate">{h.scenario}</span><span className="block text-xs text-muted truncate">{(h.mode || "demo") === "live" ? "Live" : "Demo"} · {new Date(h.at).toLocaleString()}</span></span>
              </button></li>))}</ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
