import { NextResponse } from "next/server";
import { liveCodeOk, rateOk } from "@/lib/gate";
import { Setup, Script, ruleScore, clamp, gradeOf } from "@/lib/core";
import { getIndustry, scenarioOf, factList, kindOf } from "@/lib/industries";

const MODEL = () => process.env.OPENAI_MODEL || "gpt-4o-mini";
// GPT-5 / o-series reasoning models reject temperature and use max_completion_tokens.
function reqBody(prompt: string) {
  const model = MODEL(); const reasoning = /^(gpt-5|o\d)/i.test(model);
  return { model, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }],
    ...(reasoning ? { max_completion_tokens: 4000 } : { temperature: 0, max_tokens: 800 }) };
}

export async function POST(req: Request) {
  const { setup, script } = (await req.json()) as { setup: Setup; script: Script };
  // Live (code-verified) requests always get the LLM; public demo requests get a few LLM scores per IP per hour, then rules.
  const allowed = liveCodeOk(req) || rateOk(req);
  const key = allowed && script.lines.some(l => l.who === "Staff") ? process.env.OPENAI_API_KEY : undefined;
  if (key) {
    try {
      const ind = getIndustry(setup.industry); const r0 = ind.rubric;
      const transcript = `[Phone answered after ${script.answerSecs != null ? Math.round(script.answerSecs) + " seconds (~" + script.rings + " rings)" : script.rings + " rings"}]\n` + script.lines.map(l => `${l.who}: ${l.text}`).join("\n");
      const facts = factList(setup).map(x => `- ${x.label}: ${x.value || "(none)"}`).join("\n");
      const prompt = `You grade a mystery-shopper phone call to a ${kindOf(setup)}. Scenario: ${scenarioOf(setup).label}.
Facts entered by the owner:\n- Business name: ${setup.biz}\n${facts}
Score each 0-10 integer:
- answerSpeed: time to answer; 1-2 rings / under 10s = 10, 9+ rings / 50s+ = 1; 0 if never answered.
- greeting ("${r0.greeting[0]}"): ${r0.greeting[1]}
- accuracy ("${r0.accuracy[0]}"): ${r0.accuracy[1]} Missing or vague answers count against.
- booking ("${r0.booking[0]}"): ${r0.booking[1]} Merely asking "do you want to book?" is at most 6.
Give 2-4 specific, actionable fixes referencing what was actually said. Return JSON only: {"answerSpeed":n,"greeting":n,"accuracy":n,"booking":n,"fixes":[string]}.\n\nTranscript:\n${transcript}`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(reqBody(prompt)),
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json(); const o = JSON.parse(j.choices[0].message.content);
      const sc = { answerSpeed: clamp(o.answerSpeed), greeting: clamp(o.greeting), accuracy: clamp(o.accuracy), booking: clamp(o.booking) };
      const overall = Math.round(((sc.answerSpeed + sc.greeting + sc.accuracy + sc.booking) / 4) * 10) / 10;
      return NextResponse.json({ ...sc, overall, grade: gradeOf(overall), fixes: (o.fixes || []).slice(0, 4), engine: "llm", model: j.model });
    } catch (e) { console.error("LLM scoring failed, falling back to rules:", String(e).slice(0, 200)); }
  }
  return NextResponse.json(ruleScore(setup, script));
}
