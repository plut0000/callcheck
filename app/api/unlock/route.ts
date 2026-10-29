import { NextResponse } from "next/server";
import { liveCodeOk } from "@/lib/gate";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  return liveCodeOk(req) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Invalid access code" }, { status: 401 });
}
