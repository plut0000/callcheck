import { NextResponse } from "next/server";
import { liveCodeOk } from "@/lib/gate";
import { readLive, liveEnabled } from "@/lib/live";
export const dynamic = "force-dynamic";

/** GET ?id= → live transcript lines collected by the Vapi webhook so far. */
export async function GET(req: Request) {
  if (!liveCodeOk(req)) return NextResponse.json({ error: "Live access code required" }, { status: 401 });
  if (!liveEnabled()) return NextResponse.json({ error: "Live transcript is not configured" }, { status: 400 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const s = await readLive(id);
  return NextResponse.json(s || { id, status: "unknown", ended: false, lines: [] }, { headers: { "Cache-Control": "no-store" } });
}
