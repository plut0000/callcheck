import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const key = !!process.env.VAPI_API_KEY && !!process.env.LIVE_ACCESS_CODE;
  const outbound = key && !!process.env.VAPI_PHONE_NUMBER_ID;
  const inbound = key && !!process.env.VAPI_PHONE_NUMBER_ID && !!process.env.VAPI_INBOUND_NUMBER;
  return NextResponse.json({ live: outbound || inbound, outbound, inbound, inboundNumber: process.env.VAPI_INBOUND_NUMBER || null, llm: !!process.env.OPENAI_API_KEY });
}
