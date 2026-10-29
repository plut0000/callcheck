"use client";
import { useEffect, useRef, useState } from "react";
import { Setup, Script, CallRecord, Score, Line, buildScripts, coach, defaultTips, Tip } from "@/lib/core";
import { INDUSTRIES, DEFAULT_INDUSTRY, getIndustry, scenarioOf } from "@/lib/industries";

type View = "landing" | "onboard" | "call" | "dashboard";
type Cfg = { live: boolean; outbound?: boolean; inbound?: boolean; inboundNumber?: string | null; llm: boolean };
const KEY = "callcheck.history.v2";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fresh = (industry: string, phone = "(555) 010-0199"): Setup => {
  const ind = getIndustry(industry);
  return { industry: ind.id, biz: ind.biz, phone, values: Object.fromEntries(ind.fields.map(f => [f.key, f.value])), scenario: ind.scenarios[0].id, bizType: "", questions: "" };
};

const btn = "inline-flex items-center justify-center h-10 px-4 rounded-[5px] text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const btnPrimary = `${btn} bg-accent text-white hover:bg-[#173B2C]`;
const btnGhost = `${btn} border border-line bg-white hover:border-ink/40`;
const card = "bg-white border border-line rounded-md";
const eyebrow = "text-[11px] uppercase tracking-[0.14em] text-muted font-medium";

function ModeTag({ live }: { live: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold px-2 py-1 rounded-[3px] border ${live ? "border-accent text-accent bg-accent-soft" : "border-warn/40 text-warn bg-[#FBF5EC]"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-accent" : "bg-warn"}`} />{live ? "Live call" : "Demo mode"}</span>;
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
  const live = cfg.live && useLive && !!code;
  const addRecord = (rec: CallRecord) => setHistory(h => { const n = [rec, ...h]; localStorage.setItem(KEY, JSON.stringify(n)); return n; });
  const navItem = (v: View, label: string) => <button onClick={() => setView(v)} className={`text-sm ${view === v ? "text-ink" : "text-muted hover:text-ink"}`}>{label}</button>;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-paper">
        <div className="max-w-[1120px] mx-auto px-8 h-14 flex items-center justify-between">
          <button onClick={() => setView("landing")} className="font-serif text-[22px] tracking-tight">CallCheck</button>
          <nav className="flex items-center gap-7">
            {navItem("onboard", "New test")}{navItem("dashboard", "Dashboard")}
            <ModeTag live={live} />
          </nav>
        </div>
      </header>
      <div className="flex-1">
        {view === "landing" && <Landing go={() => setView("onboard")} />}
        {view === "onboard" && <Onboard {...{ setup, setSetup, consent, setConsent, cfg, useLive, setUseLive, live, code, setCode, kind, setKind }} go={() => setView("call")} />}
        {view === "call" && <LiveCall live={live} code={code} kind={kind} cfg={cfg} setup={setup} consent={consent} back={() => setView("onboard")} onDone={(rec) => { addRecord(rec); setSelected(rec.id); setView("dashboard"); }} />}
        {view === "dashboard" && <Dashboard history={history} selected={selected} setSelected={setSelected} clear={() => { setHistory([]); localStorage.setItem(KEY, "[]"); }} newTest={() => setView("onboard")} />}
      </div>
      <footer className="border-t border-line"><div className="max-w-[1120px] mx-auto px-8 py-6 text-xs text-muted flex justify-between"><span>CallCheck · prototype</span><span>Sample data only. No real businesses.</span></div></footer>
    </div>
  );
}

function Landing({ go }: { go: () => void }) {
  const rows: [string, string, string][] = [
    ["Cost per call", "≈ $9.75", "$25–69"],
    ["Setup fee", "None", "Usually"],
    ["Turnaround", "Minutes", "Days"],
    ["Full transcript", "Every call", "Rarely"],
  ];
  return (
    <main className="max-w-[1120px] mx-auto px-8 fade-in">
      <section className="grid grid-cols-12 gap-10 pt-20 pb-16 border-b border-line">
        <div className="col-span-12 md:col-span-7">
          <div className={eyebrow}>Phone mystery shopping</div>
          <h1 className="font-serif text-[56px] leading-[1.04] tracking-[-0.02em] mt-5">Find out how your phone is answered when you're not there.</h1>
          <p className="mt-6 text-[17px] leading-relaxed text-muted max-w-[34rem]">CallCheck calls your business as an ordinary customer, then grades the call and coaches your team: how fast staff picked up, how they greeted, whether the facts were right, and whether they offered a time. Set up for dealerships, salons, restaurants, clinics and home services.</p>
          <div className="mt-9 flex items-center gap-4">
            <button onClick={go} className={btnPrimary + " h-11 px-5"}>Run a test call</button>
            <span className="text-sm text-muted">Takes about two minutes.</span>
          </div>
        </div>
        <aside className="col-span-12 md:col-span-5 md:pl-6">
          <div className={card + " p-7"}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Starter</span><span className={eyebrow}>Monthly</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5"><span className="font-serif text-[52px] leading-none tnum">$39</span><span className="text-muted">/ month</span></div>
            <p className="mt-2 text-sm text-muted">Four test calls a month, each with a scorecard and transcript.</p>
            <table className="w-full mt-6 text-sm">
              <thead><tr className="text-left text-muted border-b border-line"><th className="font-normal pb-2"></th><th className="font-medium text-ink pb-2">CallCheck</th><th className="font-normal pb-2">Human shopper</th></tr></thead>
              <tbody>{rows.map(([a, b, c]) => <tr key={a} className="border-b border-line last:border-0"><td className="py-2.5 text-muted">{a}</td><td className="py-2.5 tnum">{b}</td><td className="py-2.5 text-muted tnum">{c}</td></tr>)}</tbody>
            </table>
            <p className="mt-3 text-xs text-muted">Human mystery shoppers typically charge $25–69 per call, plus setup.</p>
            <button onClick={go} className={btnGhost + " w-full mt-6"}>Start with a test call</button>
          </div>
        </aside>
      </section>
      <section className="grid md:grid-cols-4 gap-px bg-line border-x border-b border-line mb-20">
        {[["Answer speed", "Rings before a person picks up."], ["Greeting", "Business name, a name, an offer to help."], ["Accuracy", "Hours, prices and specials checked against what you entered."], ["Booking", "Whether staff asked for the appointment."]].map(([t, d], i) => (
          <div key={t} className="bg-paper p-6"><div className="text-xs text-muted tnum">0{i + 1}</div><div className="font-serif text-xl mt-2">{t}</div><p className="text-sm text-muted mt-1.5 leading-relaxed">{d}</p></div>))}
      </section>
    </main>
  );
}

const inp = "w-full h-10 rounded-[5px] border border-line bg-white px-3 text-[15px] focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink";
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-medium">{label}</span>{hint && <span className="text-sm text-muted"> · {hint}</span>}<div className="mt-1.5">{children}</div></label>;
}

function Onboard(p: { setup: Setup; setSetup: (s: Setup) => void; consent: boolean; setConsent: (b: boolean) => void; cfg: Cfg; useLive: boolean; setUseLive: (b: boolean) => void; live: boolean; code: string; setCode: (c: string) => void; kind: "inbound" | "outbound"; setKind: (k: "inbound" | "outbound") => void; go: () => void }) {
  const { setup, setSetup, consent, setConsent, cfg, useLive, setUseLive, live, code, setCode, kind, setKind, go } = p;
  const [draft, setDraft] = useState(""); const [codeErr, setCodeErr] = useState("");
  const unlock = async () => { const r = await fetch("/api/unlock", { method: "POST", headers: { "x-live-code": draft.trim() } }); if (r.ok) { setCode(draft.trim()); setCodeErr(""); } else setCodeErr("That code isn't valid."); };
  const ind = getIndustry(setup.industry);
  const isCustom = ind.id === "custom";
  const val = (k: string) => (e: any) => setSetup({ ...setup, values: { ...setup.values, [k]: e.target.value } });
  const ok = consent && setup.biz && (setup.phone || (live && kind === "inbound")) && (!isCustom || (setup.questions || "").trim());
  return (
    <main className="max-w-[760px] mx-auto px-8 py-14 fade-in">
      <div className="flex items-center justify-between"><div className={eyebrow}>New test call</div><ModeTag live={live} /></div>
      <h2 className="font-serif text-[40px] tracking-[-0.01em] mt-3">Set up the call</h2>
      <p className="text-muted mt-1">Enter what staff should tell a customer. The call is graded against these facts.</p>

      <div className={card + " mt-8 divide-y divide-line"}>
        <section className="p-6 grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2"><Field label="Industry">
            <select id="industry" className={inp} value={setup.industry} onChange={e => setSetup({ ...fresh(e.target.value, setup.phone) })}>
              {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select></Field></div>
          <Field label="Business name"><input name="biz" className={inp} value={setup.biz} onChange={e => setSetup({ ...setup, biz: e.target.value })} /></Field>
          <Field label="Phone number"><input name="phone" className={inp} value={setup.phone} onChange={e => setSetup({ ...setup, phone: e.target.value })} /></Field>
          {isCustom && <div className="sm:col-span-2"><Field label="Business type"><input name="bizType" className={inp} value={setup.bizType} placeholder="e.g. bike repair shop" onChange={e => setSetup({ ...setup, bizType: e.target.value })} /></Field></div>}
          {ind.fields.map(f => <Field key={f.key} label={f.label} hint={f.hint}><input name={f.key} className={inp} value={setup.values[f.key] ?? ""} onChange={val(f.key)} /></Field>)}
        </section>
        <section className="p-6">
          {isCustom ? <Field label="Questions the caller should ask" hint="one per line">
            <textarea name="questions" className={inp + " h-auto py-2"} rows={3} placeholder={"Do you do tune-ups on weekends?\nWhat does a basic tune-up cost?"} value={setup.questions} onChange={e => setSetup({ ...setup, questions: e.target.value })} /></Field>
          : <>
            <div className="text-sm font-medium mb-3">Scenario</div>
            <div className="border border-line rounded-[5px] divide-y divide-line">
              {ind.scenarios.map(s => (
                <label key={s.id} data-scenario={s.id} className={`flex items-center gap-3 px-4 h-12 cursor-pointer text-[15px] ${setup.scenario === s.id ? "bg-accent-soft" : "hover:bg-paper"}`}>
                  <input type="radio" name="scenario" className="accent-[#1F4D3A]" checked={setup.scenario === s.id} onChange={() => setSetup({ ...setup, scenario: s.id })} />{s.label}
                </label>))}
            </div></>}
          <div className="mt-4 text-xs text-muted">Graded on: Answer speed · {ind.rubric.greeting[0]} · {ind.rubric.accuracy[0]} · {ind.rubric.booking[0]}</div>
        </section>
        {cfg.live && <section className="p-6">
          <div className="text-sm font-medium mb-3">Mode</div>
          <div className="inline-flex border border-line rounded-[5px] overflow-hidden text-sm">
            {[["live", "Live call"], ["demo", "Demo"]].map(([k, l]) => <button key={k} data-mode={k} onClick={() => setUseLive(k === "live")} className={`px-4 h-9 ${(k === "live") === useLive ? "bg-accent text-white" : "bg-white hover:bg-paper"}`}>{l}</button>)}
          </div>
          {useLive && !code && <div className="mt-4 flex items-end gap-3">
            <div className="flex-1"><Field label="Live access code" hint="required for real calls"><input id="livecode" type="password" className={inp} value={draft} onChange={e => setDraft(e.target.value)} /></Field></div>
            <button onClick={unlock} className={btnGhost}>Unlock</button>
          </div>}
          {useLive && code && <div className="mt-3 text-sm text-accent">Live calls unlocked for this session.</div>}
          {useLive && <div className="mt-5 grid gap-3">
            {cfg.inbound && <label data-kind="inbound" className={`block border rounded-[5px] p-4 cursor-pointer ${kind === "inbound" ? "border-accent bg-accent-soft" : "border-line hover:bg-paper"}`}>
              <div className="flex items-center gap-3"><input type="radio" name="kind" className="accent-[#1F4D3A]" checked={kind === "inbound"} onChange={() => setKind("inbound")} />
                <span className="text-[15px] font-medium">Call in from the business phone</span><span className="text-xs text-accent uppercase tracking-[0.1em]">Recommended</span></div>
              <div className="pl-7 mt-1 text-sm text-muted">Staff dial <span className="tnum text-ink">{cfg.inboundNumber}</span>. Works from Canada and the US.</div>
            </label>}
            {cfg.outbound && <label data-kind="outbound" className={`block border rounded-[5px] p-4 cursor-pointer ${kind === "outbound" ? "border-accent bg-accent-soft" : "border-line hover:bg-paper"}`}>
              <div className="flex items-center gap-3"><input type="radio" name="kind" className="accent-[#1F4D3A]" checked={kind === "outbound"} onChange={() => setKind("outbound")} />
                <span className="text-[15px]">We call the business</span></div>
              <div className="pl-7 mt-1 text-sm text-muted">US numbers only for now. Canadian numbers can't be dialed yet; use call-in instead.</div>
            </label>}
          </div>}
          {codeErr && <div className="mt-2 text-sm text-bad">{codeErr}</div>}
        </section>}
        <section className="p-6 space-y-4">
          <label className="flex gap-3 items-start text-[15px]">
            <input id="consent" type="checkbox" className="mt-1 h-4 w-4 accent-[#1F4D3A]" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>I agree to test calls and will tell staff that calls may be tested.</span>
          </label>
          <p className="text-sm text-muted leading-relaxed pl-7">Only test a number you own or are authorized to manage. Let staff know ahead of time that calls may be tested and recorded. Recording-consent rules vary by province and state.</p>
        </section>
        <section className="p-6 flex items-center justify-between gap-4">
          <span className="text-sm text-muted">{!live ? "Demo mode: the call is simulated. No phone call is placed." : kind === "inbound" ? `Next: call ${cfg.inboundNumber} from the business phone.` : "This will place a real outbound call to the number above."}</span>
          <button disabled={!ok} onClick={go} className={btnPrimary + " shrink-0"}>Run test call</button>
        </section>
      </div>
    </main>
  );
}

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

  return (
    <main className="max-w-[760px] mx-auto px-8 py-14 fade-in">
      {live && inboundWait && <section id="callin" className={card + " mb-6 p-7"}>
        <div className={eyebrow}>Call this number</div>
        <a href={`tel:${(ls.number || "").replace(/[^\d+]/g, "")}`} className="block font-serif text-[48px] leading-none tracking-[-0.01em] mt-3 tnum text-accent">{ls.number}</a>
        <ol className="mt-6 grid sm:grid-cols-3 gap-px bg-line border border-line rounded-[5px] overflow-hidden text-sm">
          {[["Call from the business phone", "Use the line your staff normally answer from, so the test feels real."], ["The AI shopper talks", `A customer calls ${setup.biz} about: ${sc.label.toLowerCase()}. Answer as you would for any caller.`], ["Hang up for your scorecard", "When the call ends, it's graded here automatically. Keep this page open."]].map(([t, d], i) => (
            <li key={t} className="bg-paper p-4"><div className="text-xs text-muted tnum">0{i + 1}</div><div className="font-medium mt-1">{t}</div><p className="text-muted mt-1 leading-relaxed">{d}</p></li>))}
        </ol>
        <div className="mt-5 flex items-center justify-between gap-4 text-sm text-muted">
          <span>Already called and this page didn't pick it up?</span>
          <button data-find-latest onClick={() => { findLatest.current = true; }} className={btnGhost}>Find my latest call</button>
        </div>
      </section>}
      <div className={`mb-6 border px-4 py-2.5 text-sm flex items-center justify-between rounded-[5px] ${live && phase === "error" ? "border-bad/40 bg-[#FBEFEF] text-bad" : live ? "border-accent/40 bg-accent-soft text-accent" : "border-warn/40 bg-[#FBF5EC] text-warn"}`}>
        <span className="font-semibold">{!live ? "Demo mode: simulated call." : phase === "error" ? "The call didn't start." : inboundWait ? "Live test: waiting for your call." : phase === "dialing" ? (kind === "inbound" ? "Getting the shopper ready…" : "Starting the live call…") : phase === "scoring" ? "Call ended." : "Live call in progress."}</span>
        <span className="opacity-80">{!live ? "No real phone call is placed" : phase === "error" ? "Nothing was recorded" : "Recording and transcript on"}</span>
      </div>
      <div className={card}>
        <div className="px-6 py-5 border-b border-line flex items-center justify-between">
          <div>
            <div className={eyebrow}>{label}</div>
            <div className="font-serif text-[26px] mt-1">{setup.biz}</div>
            <div className="text-sm text-muted tnum">{ind.label}{setup.phone ? ` · ${setup.phone}` : ""}</div>
          </div>
          <div className="text-right">
            <div className="tnum text-[28px] font-medium tracking-tight" data-testid="timer">{mm}</div>
            <div className="text-xs text-muted flex items-center gap-1.5 justify-end">
              <span className={`h-1.5 w-1.5 rounded-full ${phase === "connected" ? "bg-accent" : phase === "error" ? "bg-bad" : "bg-warn blink"}`} />{statusText}
            </div>
          </div>
        </div>
        <div className="h-[400px] overflow-y-auto px-6 py-5">
          {lines.length === 0 && phase !== "error" && <div className="h-full grid place-items-center text-sm text-muted">{phase === "dialing" ? (inboundWait ? `Waiting for a call to ${ls.number}` : kind === "inbound" ? `Getting a ${ind.label.toLowerCase()} shopper ready for ${setup.biz}. The number appears once Vapi confirms` : "Placing call") : "Waiting for someone to pick up"}<span className="blink">…</span></div>}
          {phase === "error" && <div className="h-full grid place-items-center text-center text-sm"><div><p className="text-bad">{ls.error}</p><button onClick={back} className={btnGhost + " mt-4"}>Back to setup</button></div></div>}
          <dl className="space-y-3.5">
            {lines.map((l, i) => (
              <div key={i} className="fade-in grid grid-cols-[72px_1fr] gap-4 text-[15px] leading-relaxed">
                <dt className={`text-xs uppercase tracking-[0.1em] pt-1 ${l.who === "Staff" ? "text-accent font-semibold" : "text-muted"}`}>{l.who === "Staff" ? "Staff" : "Caller"}</dt>
                <dd>{l.text}</dd>
              </div>))}
          </dl>
          {phase === "scoring" && <div className="text-sm text-muted mt-6 border-t border-line pt-4">Grading the call<span className="blink">…</span></div>}
          <div ref={end} />
        </div>
      </div>
    </main>
  );
}

const tone = (n: number) => n >= 8 ? "bg-accent" : n >= 5 ? "bg-warn" : "bg-bad";
const gradeTone = (g: string) => /^[AB]/.test(g) ? "text-accent" : g.startsWith("C") ? "text-warn" : "text-bad";

function Dashboard({ history, selected, setSelected, clear, newTest }: { history: CallRecord[]; selected: string | null; setSelected: (s: string) => void; clear: () => void; newTest: () => void }) {
  const rec = history.find(h => h.id === selected) || history[0];
  if (!rec) return <main className="max-w-[760px] mx-auto px-8 py-24 text-center"><h2 className="font-serif text-3xl">No calls yet</h2><p className="text-muted mt-2">Run a test call to see a scorecard here.</p><button onClick={newTest} className={btnPrimary + " mt-6"}>Run a test call</button></main>;
  const s = rec.score;
  const rb = getIndustry(rec.setup.industry).rubric;
  const cats: [string, number, string][] = [["Answer speed", s.answerSpeed, "Picked up within three rings."], [rb.greeting[0], s.greeting, rb.greeting[1]], [rb.accuracy[0], s.accuracy, rb.accuracy[1]], [rb.booking[0], s.booking, rb.booking[1]]];
  const seenC = new Set<string>();
  const coaching = s.fixes.map(f => ({ fix: f, ...coach(f, rec.setup) })).filter(c => !seenC.has(c.title) && seenC.add(c.title));
  const latest = history[0];
  const seen = new Set<string>();
  const top: Tip[] = [...latest.score.fixes.map(f => coach(f, latest.setup)), ...defaultTips(latest.setup)].filter(t => !seen.has(t.title) && seen.add(t.title)).slice(0, 3);
  const mode = rec.mode || "demo";
  return (
    <main className="max-w-[1120px] mx-auto px-8 py-12 fade-in">
      <div className="flex items-end justify-between pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-3"><span className={eyebrow}>Latest scorecard</span><ModeTag live={mode === "live"} /></div>
          <h2 className="font-serif text-[40px] tracking-[-0.01em] mt-2">{rec.setup.biz}</h2>
          <p className="text-muted text-sm">{getIndustry(rec.setup.industry).label} · {rec.scenario} · {new Date(rec.at).toLocaleString()}</p>
        </div>
        <button onClick={newTest} className={btnPrimary}>New test call</button>
      </div>
      <div className="grid grid-cols-12 gap-8 mt-8">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <section id="scorecard" className={card + " grid sm:grid-cols-[200px_1fr]"}>
            <div className="p-6 sm:border-r border-b sm:border-b-0 border-line">
              <div className={eyebrow}>Overall</div>
              <div className={`font-serif text-[88px] leading-none mt-3 ${gradeTone(s.grade)}`}>{s.grade}</div>
              <div className="text-sm text-muted mt-2 tnum">{s.overall} / 10</div>
            </div>
            <div className="p-6 space-y-5">
              {cats.map(([k, v, good]) => (
                <div key={k} title={good}>
                  <div className="flex justify-between text-sm"><span>{k}</span><span className="tnum font-medium">{v}<span className="text-muted font-normal"> / 10</span></span></div>
                  <div className="h-[3px] bg-line mt-2"><div className={`h-[3px] ${tone(v)}`} style={{ width: `${v * 10}%` }} /></div>
                </div>))}
              <div className="text-xs text-muted pt-1">Graded by {s.engine === "llm" ? `language model (${s.model || "LLM"})` : "rule-based scorer"} · {mode === "live" ? `live call${rec.endedReason ? `, ended: ${rec.endedReason}` : ""}` : "simulated call"}</div>
            </div>
          </section>
          <section>
            <h3 className="font-serif text-2xl">What to fix</h3>
            <ol className="mt-4 border-t border-line">{s.fixes.map((f, i) => <li key={i} className="grid grid-cols-[40px_1fr] py-3.5 border-b border-line text-[15px]"><span className="tnum text-muted">{String(i + 1).padStart(2, "0")}</span><span>{f}</span></li>)}</ol>
          </section>
          <section id="coaching">
            <h3 className="font-serif text-2xl">Coaching</h3>
            <p className="text-sm text-muted mt-1">Each fix as something to practise, with a line staff can use.</p>
            <div className="mt-4 border-t border-line">{coaching.map((c, i) => (
              <div key={i} className="grid sm:grid-cols-[40px_1fr] py-4 border-b border-line">
                <span className="tnum text-muted text-[15px]">{String(i + 1).padStart(2, "0")}</span>
                <div><div className="font-medium text-[15px]">{c.title}</div><p className="text-sm text-muted mt-1">{c.tip}</p>
                  <blockquote className="mt-2.5 border-l-2 border-accent pl-3 font-serif text-[17px] italic">“{c.example}”</blockquote></div>
              </div>))}</div>
          </section>
          <section>
            <div className="flex items-baseline justify-between"><h3 className="font-serif text-2xl">Transcript</h3>
              <span className="text-xs text-muted">{rec.script.answerSecs != null ? `Answered after ${Math.round(rec.script.answerSecs)}s` : `Picked up after ${rec.script.rings} rings`}{rec.recordingUrl && <> · <a className="underline" href={rec.recordingUrl} target="_blank">Recording</a></>}</span></div>
            <dl className="mt-4 border-t border-line pt-4 space-y-3">{rec.script.lines.length ? rec.script.lines.map((l, i) => <div key={i} className="grid grid-cols-[72px_1fr] gap-4 text-[15px] leading-relaxed"><dt className={`text-xs uppercase tracking-[0.1em] pt-1 ${l.who === "Staff" ? "text-accent font-semibold" : "text-muted"}`}>{l.who}</dt><dd>{l.text}</dd></div>) : <p className="text-sm text-muted">No one answered.</p>}</dl>
          </section>
        </div>
        <aside className="col-span-12 lg:col-span-4">
          <section id="tips" className={card + " p-5 mb-8"}>
            <div className="flex items-baseline justify-between"><h3 className="font-serif text-xl">Practice this week</h3><span className={eyebrow}>Top 3</span></div>
            <ol className="mt-3 space-y-4">{top.map((t, i) => (
              <li key={i} className="grid grid-cols-[22px_1fr] text-sm"><span className="tnum text-muted">{i + 1}.</span>
                <div><div className="font-medium">{t.title}</div><div className="mt-1 text-accent font-serif italic text-[15px]">“{t.example}”</div></div></li>))}</ol>
            <p className="text-xs text-muted mt-4 border-t border-line pt-3">From the latest scorecard. Read the lines aloud at the start of a shift.</p>
          </section>
          <div className="flex items-baseline justify-between"><h3 className="font-serif text-2xl">History</h3><button onClick={clear} className="text-xs text-muted hover:text-bad">Clear</button></div>
          <ul className="mt-4 border-t border-line">{history.map(h => (
            <li key={h.id}><button onClick={() => setSelected(h.id)} className={`w-full text-left grid grid-cols-[44px_1fr] items-center py-3 border-b border-line px-2 -mx-2 ${h.id === rec.id ? "bg-white" : "hover:bg-white/60"}`}>
              <span className={`font-serif text-2xl ${gradeTone(h.score.grade)}`}>{h.score.grade}</span>
              <span className="min-w-0"><span className="block text-sm truncate">{h.scenario}</span><span className="block text-xs text-muted">{(h.mode || "demo") === "live" ? "Live" : "Demo"} · {new Date(h.at).toLocaleString()}</span></span>
            </button></li>))}</ul>
        </aside>
      </div>
    </main>
  );
}
