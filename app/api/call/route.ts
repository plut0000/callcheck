import { NextResponse } from "next/server";
import { Line, Setup } from "@/lib/core";
import { assistantBody } from "@/lib/industries";
import { liveCodeOk } from "@/lib/gate";
import { serverConfig } from "@/lib/live";
export const dynamic = "force-dynamic";
const API = "https://api.vapi.ai";
const auth = () => ({ Authorization: `Bearer ${process.env.VAPI_API_KEY}`, "Content-Type": "application/json" });
const outbound = () => !!(process.env.VAPI_API_KEY && process.env.VAPI_PHONE_NUMBER_ID);
// Call-in mode: businesses phone our Vapi number; we find their call by phone number ID.
const inbound = () => !!(process.env.VAPI_API_KEY && process.env.VAPI_PHONE_NUMBER_ID && process.env.VAPI_INBOUND_NUMBER);
// Only rewrite the inbound assistant's prompt when explicitly enabled (off by default).

function toE164(raw: string) {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.length === 10) return "+1" + d;
  return "+" + d;
}

/**
 * One assistant per industry ("CallCheck Shopper - <industry>"), created on first use and PATCHed with
 * this test's business/scenario prompt. Then the phone number's assistantId is switched to it and read
 * back to confirm. The original assistant in VAPI_ASSISTANT_ID is never modified.
 */
async function prepareInbound(assistant: any): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const list = await fetch(`${API}/assistant?limit=100`, { headers: auth(), cache: "no-store" }).then(r => r.json()).catch(() => []);
  const found = (Array.isArray(list) ? list : []).find((a: any) => a.metadata?.app === "callcheck" && a.metadata?.industry === assistant.metadata?.industry && a.id !== process.env.VAPI_ASSISTANT_ID);
  const r = found
    ? await fetch(`${API}/assistant/${found.id}`, { method: "PATCH", headers: auth(), body: JSON.stringify(assistant) })
    : await fetch(`${API}/assistant`, { method: "POST", headers: auth(), body: JSON.stringify(assistant) });
  const a = await r.json().catch(() => ({}));
  if (!r.ok || !a.id) return { ok: false, error: `Could not configure the shopper: ${a.message || r.status}` };
  const pid = encodeURIComponent(process.env.VAPI_PHONE_NUMBER_ID!);
  const pr = await fetch(`${API}/phone-number/${pid}`, { method: "PATCH", headers: auth(), body: JSON.stringify({ assistantId: a.id }) });
  if (!pr.ok) { const j = await pr.json().catch(() => ({})); return { ok: false, error: `Could not attach the shopper to the number: ${j.message || pr.status}` }; }
  const check = await fetch(`${API}/phone-number/${pid}`, { headers: auth(), cache: "no-store" }).then(r => r.json()).catch(() => ({}));
  if (check.assistantId !== a.id) return { ok: false, error: "Vapi didn't confirm the number update. Try again." };
  return { ok: true, id: a.id };
}

/**
 * POST: start a test.
 *  - If VAPI_ASSISTANT_ID is set, PATCH that assistant so it matches the selected industry/scenario
 *    (waits for staff to speak first).
 *  - If VAPI_PHONE_NUMBER_ID is set and kind=outbound, place an outbound call with a transient copy.
 *  - Otherwise return {inbound:true, since}; the client polls for the next call to the assistant.
 */
export async function POST(req: Request) {
  if (!outbound() && !inbound()) return NextResponse.json({ error: "Live calling is not configured" }, { status: 400 });
  if (!liveCodeOk(req)) return NextResponse.json({ error: "Live access code required" }, { status: 401 });
  const { setup, consent, kind } = (await req.json()) as { setup: Setup; consent: boolean; kind?: "outbound" | "inbound" };
  if (!consent) return NextResponse.json({ error: "Consent is required" }, { status: 400 });
  const assistant = { ...assistantBody(setup), ...serverConfig() };
  const since = new Date().toISOString();
  if (inbound() && kind !== "outbound") {
    // Point the call-in number at a CallCheck shopper for this industry, configured for this test.
    try { const r = await prepareInbound(assistant); if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 }); return NextResponse.json({ inbound: true, since, number: process.env.VAPI_INBOUND_NUMBER || null, assistantId: r.id, ready: true }); }
    catch (e) { return NextResponse.json({ error: `Could not get the shopper ready: ${String(e).slice(0, 120)}` }, { status: 502 }); }
  }
  if (outbound() && kind === "outbound") {
    const body = { name: `CallCheck: ${setup.biz}`.slice(0, 40), phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID, customer: { number: toE164(setup.phone), name: setup.biz.slice(0, 40) }, assistant: { ...assistant, voicemailMessage: "Hi, sorry, I'll call back later. Thanks!" } };
    const r = await fetch(`${API}/call`, { method: "POST", headers: auth(), body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return NextResponse.json({ error: j.message || `Vapi error ${r.status}` }, { status: 502 });
    return NextResponse.json({ id: j.id, status: j.status });
  }
  return NextResponse.json({ inbound: true, since, number: process.env.VAPI_INBOUND_NUMBER || null });
}

/** GET ?id=  → call detail.  GET ?since= → newest call to the assistant created after `since`, if any. */
export async function GET(req: Request) {
  if (!outbound() && !inbound()) return NextResponse.json({ error: "Live calling is not configured" }, { status: 400 });
  if (!liveCodeOk(req)) return NextResponse.json({ error: "Live access code required" }, { status: 401 });
  const u = new URL(req.url); let id = u.searchParams.get("id"); const since = u.searchParams.get("since");
  const latest = u.searchParams.get("latest");
  if (!id && (since || latest)) {
    // Newest inbound call on our number, created after `since` (or in the last 24h for "latest").
    const after = since || new Date(Date.now() - 24 * 3600e3).toISOString();
    const q = new URLSearchParams({ phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || "", createdAtGt: after, limit: "20" });
    const r = await fetch(`${API}/call?${q}`, { headers: auth(), cache: "no-store" });
    const arr = await r.json().catch(() => []);
    if (!r.ok) return NextResponse.json({ error: `Vapi error ${r.status}` }, { status: 502 });
    // `clicked` = when the test started. A call that had already ended by then is a previous test, never this one
    // (the 1-minute slack used to pick up a just-finished call and jump straight to grading).
    const clicked = Date.parse(u.searchParams.get("clicked") || "") || null;
    let calls = (Array.isArray(arr) ? arr : []).filter((c: any) => c.type === "inboundPhoneCall").sort((a: any, b: any) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    if (clicked) calls = calls.filter((c: any) => !(c.status === "ended" && (!c.endedAt || Date.parse(c.endedAt) < clicked)));
    if (latest) { const open = calls.filter((c: any) => c.status !== "ended"); if (open.length) calls = open; }
    if (!calls.length) return NextResponse.json({ status: "waiting", lines: [], ended: false });
    id = calls[0].id;
  }
  if (!id) return NextResponse.json({ error: "id or since required" }, { status: 400 });
  const r = await fetch(`${API}/call/${encodeURIComponent(id)}`, { headers: auth(), cache: "no-store" });
  const c = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ error: c.message || `Vapi error ${r.status}` }, { status: 502 });
  const msgs: any[] = c.artifact?.messages || c.messages || [];
  // The business staff is the "user"; our shopper assistant is the "bot".
  const lines: Line[] = msgs.filter(m => (m.role === "user" || m.role === "bot") && m.message).map(m => ({ who: m.role === "user" ? "Staff" : "Caller", text: m.message }));
  let answerSecs: number | null = null;
  if (c.type !== "inboundPhoneCall" && c.createdAt && c.startedAt) answerSecs = Math.max(0, (Date.parse(c.startedAt) - Date.parse(c.createdAt)) / 1000);
  const firstStaff = msgs.find(m => m.role === "user");
  if (firstStaff?.secondsFromStart != null) answerSecs = (answerSecs ?? 0) + Math.max(0, firstStaff.secondsFromStart);
  return NextResponse.json({
    id: c.id, type: c.type, status: c.status, endedReason: c.endedReason, ended: c.status === "ended",
    lines, answerSecs, rings: answerSecs == null ? null : Math.max(1, Math.round(answerSecs / 6)),
    recordingUrl: c.artifact?.recording?.mono?.combinedUrl || c.artifact?.recordingUrl || c.recordingUrl || null,
  });
}
