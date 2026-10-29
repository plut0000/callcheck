import { NextResponse } from "next/server";
import { webhookOk, readLive, writeLive, toLine, LiveState, LiveLine } from "@/lib/live";
export const dynamic = "force-dynamic";

/** Vapi server-message webhook: keeps a per-call live transcript in Blob storage. */
export async function POST(req: Request) {
  if (!webhookOk(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { message: m } = (await req.json().catch(() => ({}))) as any;
  const id: string | undefined = m?.call?.id;
  if (!m || !id) return NextResponse.json({ ok: true, ignored: true });
  const cur: LiveState = (await readLive(id)) || { id, status: "in-progress", ended: false, lines: [], updatedAt: "" };
  if (m.type === "conversation-update" && Array.isArray(m.messages)) {
    // Full conversation so far: replace (idempotent, order-safe).
    const lines = m.messages.map((x: any) => toLine(x.role, x.message ?? x.content)).filter(Boolean) as LiveLine[];
    if (lines.length >= cur.lines.length) cur.lines = lines;
  } else if (m.type === "transcript" && (m.transcriptType ?? "final") === "final") {
    const l = toLine(m.role, m.transcript);
    if (l && !(cur.lines.at(-1)?.who === l.who && cur.lines.at(-1)?.text === l.text)) cur.lines.push(l);
  } else if (m.type === "status-update") {
    cur.status = m.status || cur.status; if (m.status === "ended") cur.ended = true;
  } else if (m.type === "end-of-call-report") {
    cur.ended = true; cur.status = "ended";
    const lines = (m.artifact?.messages || []).map((x: any) => toLine(x.role, x.message)).filter(Boolean) as LiveLine[];
    if (lines.length >= cur.lines.length) cur.lines = lines;
  } else return NextResponse.json({ ok: true, ignored: m.type });
  cur.updatedAt = new Date().toISOString();
  await writeLive(cur);
  return NextResponse.json({ ok: true });
}
