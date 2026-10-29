import { Setup, getIndustry, scenarioOf, factList } from "./industries";
export type { Setup } from "./industries";
export type Line = { who: "Staff" | "Caller"; text: string };
export type Script = { id: string; quality: "good" | "mediocre" | "poor" | "live"; rings: number; answerSecs?: number | null; lines: Line[] };
export type Score = {
  answerSpeed: number; greeting: number; accuracy: number; booking: number;
  overall: number; grade: string; fixes: string[]; engine: "llm" | "rules"; model?: string;
};
export type CallRecord = { id: string; at: string; scenario: string; setup: Setup; script: Script; score: Score; mode: "demo" | "live"; vapiId?: string; endedReason?: string; recordingUrl?: string | null };

const S = (t: string): Line => ({ who: "Staff", text: t });
const C = (t: string): Line => ({ who: "Caller", text: t });

/** Demo scripts generated from the industry config: one strong call, one weak call. */
export function buildScripts(s: Setup): Script[] {
  const ind = getIndustry(s.industry); const sc = scenarioOf(s);
  const facts = factList(s).filter(x => x.value);
  const asks = sc.asks.length ? sc.asks : ["Hi, I had a quick question."];
  const good: Line[] = [S(`Thanks for calling ${s.biz}, this is ${ind.staff}, how can I help?`)];
  asks.forEach((q, i) => {
    good.push(C(q));
    const chunk = facts.filter((_, j) => j % asks.length === i).map(x => `${x.label.toLowerCase()}: ${x.value}`);
    good.push(S(chunk.length ? `Sure. ${chunk.map(c => c[0].toUpperCase() + c.slice(1)).join(". ")}.` : "Happy to help with that."));
  });
  good.push(S(ind.coaching.slot.replace("...", "")), C(`The first one works. It's ${ind.id === "dealership" ? "Jordan" : "Sam"}.`), S("You're all set. We'll send a confirmation text. Anything else?"), C("No, that's it. Thanks!"));
  const vague = ["Uh, I'd have to check.", "Not sure, honestly. Maybe look on the website?", "Not right now, I don't think."];
  const meh: Line[] = [S(`${s.biz}.`)];
  asks.forEach((q, i) => { meh.push(C(q)); meh.push(S(i === 0 && facts[0] ? `It's ${facts[0].value}, I think.` : vague[i % vague.length])); });
  meh.push(S("Were you wanting to come in or something?"), C("Maybe. I'll call back."), S("Okay, bye."));
  return [
    { id: `${ind.id}-good`, quality: "good", rings: 2, lines: good },
    { id: `${ind.id}-meh`, quality: "mediocre", rings: 5, lines: meh },
  ];
}

const has = (s: string, n: string) => !!n && s.toLowerCase().includes(n.toLowerCase().trim());
export const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));
export function gradeOf(o: number) { return o >= 9 ? "A" : o >= 8 ? "B+" : o >= 7 ? "B" : o >= 6 ? "C+" : o >= 5 ? "C" : o >= 4 ? "D" : "F"; }

export function ruleScore(s: Setup, sc: Script): Score {
  const ind = getIndustry(s.industry);
  const staff = sc.lines.filter(l => l.who === "Staff").map(l => l.text);
  const all = staff.join(" "); const first = staff[0] || "";
  const fixes: string[] = [];
  const answerSpeed = sc.lines.length ? clamp(11 - sc.rings * 1.1) : 0;
  if (sc.rings > 4) fixes.push(`Phone rang ${sc.rings} times before pickup. Aim to answer within 3 rings.`);
  let g = 2;
  if (has(first, s.biz)) g += 3; else fixes.push(`Answer with the business name ("${s.biz}") instead of a bare hello.`);
  if (/thank|good (morning|afternoon|evening)|hello|hi,/i.test(first)) g += 2;
  if (/how can i help|help you|my name is|this is \w+/i.test(first)) g += 3; else fixes.push("The greeting didn't give a name or offer help.");
  const facts = factList(s).filter(x => x.value && x.check);
  let hit = 0;
  for (const x of facts) { if (has(all, x.value)) hit++; else fixes.push(`Staff didn't give the ${x.label.toLowerCase()} (${x.value}).`); }
  let a = facts.length ? (hit / facts.length) * 10 : 7;
  if (/not (totally |really )?sure|i think|check the website|have to check/i.test(all)) a -= 1;
  let b = 0;
  if (ind.bookingRe.test(all)) b += 5;
  if (/\d(:\d\d)?\s?(am|pm)?\s+or\s+\d|which works|shall i|want one|you're all set/i.test(all)) b += 5;
  if (b < 10) fixes.push("Offer a specific time slot instead of asking whether they want to book.");
  const v = { answerSpeed, greeting: clamp(g), accuracy: clamp(a), booking: clamp(b) };
  const overall = Math.round(((v.answerSpeed + v.greeting + v.accuracy + v.booking) / 4) * 10) / 10;
  if (!fixes.length) fixes.push("Great call. Keep this greeting as the team standard.");
  return { ...v, overall, grade: gradeOf(overall), fixes: fixes.slice(0, 4), engine: "rules" };
}

/** Turn a fix into a coaching tip with an example line, using the industry's sample lines. */
export type Tip = { title: string; tip: string; example: string };
export function coach(fix: string, s: Setup): Tip {
  const c = getIndustry(s.industry).coaching; const t = fix.toLowerCase();
  const ex = (x: string) => x.replace(/Maple & Main|Lakeshore Motors|Harbour Street Kitchen|Riverside Dental|Brightline Plumbing/, s.biz.replace(/ Barbers$/, ""));
  const fx = factList(s).filter(x => x.value).slice(0, 2).map(x => `${x.label.toLowerCase()} is ${x.value}`);
  const facts = fx.length ? `Sure, our ${fx.join(", and our ")}.` : "Sure, here are the details.";
  if (/\brings?\b|pick ?up|answer(ed)? (within|after|faster)|answer speed/.test(t)) return { title: "Pick up by the third ring", tip: "Whoever is free grabs the phone; if no one is, route it to a backup before ring four.", example: ex(c.greeting) };
  if (/book|slot|appointment|schedul|test drive|reserv|next step|specific (available )?time/.test(t)) return { title: "Offer a specific time", tip: "Don't ask whether they want to book. Offer two real slots and let them pick one.", example: c.slot };
  if (/special|promo|offer|deal|discount|not right now/.test(t)) return { title: "Have a concrete offer ready", tip: "Keep this week's offer written by the phone so the answer is never \"not right now\".", example: c.offer };
  if (/greet|business name|shop's name|hello|introduc/.test(t)) return { title: "Answer with the business name", tip: "Every pickup: business name, your name, an offer to help. It tells callers they reached the right place.", example: ex(c.greeting) };
  return { title: "Give the exact answer", tip: "Keep hours, prices and policies on a card by the phone and read them out exactly, without \"I think\".", example: facts };
}
export const defaultTips = (s: Setup): Tip[] => ["answer with the shop's name", "have a concrete Saturday special", "offer a specific time slot"].map(f => coach(f, s));
