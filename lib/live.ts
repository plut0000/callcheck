import { createHmac, timingSafeEqual } from "crypto";
import { put, get } from "@vercel/blob";

export type LiveLine = { who: "Staff" | "Caller"; text: string };
export type LiveState = { id: string; status: string; ended: boolean; lines: LiveLine[]; updatedAt: string };

/** Webhook secret derived server-side from the Vapi key, so no extra secret needs storing. Never logged. */
export function webhookSecret() {
  const k = process.env.VAPI_API_KEY || "";
  return k ? createHmac("sha256", k).update("callcheck-webhook-v1").digest("hex") : "";
}
export function webhookOk(req: Request) {
  const want = webhookSecret(); const got = req.headers.get("x-callcheck-secret") || "";
  return !!want && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
export const liveEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN && !!process.env.VAPI_API_KEY;
export function webhookUrl() {
  const host = process.env.LIVE_WEBHOOK_HOST || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}/api/vapi/webhook` : null;
}
/** Vapi server config to attach to every CallCheck shopper (inbound and outbound). */
export function serverConfig() {
  const url = webhookUrl();
  if (!url || !liveEnabled()) return {};
  return {
    server: { url, headers: { "x-callcheck-secret": webhookSecret() } },
    serverMessages: ['transcript[transcriptType="final"]', "conversation-update", "status-update", "end-of-call-report"],
  };
}

const path = (id: string) => `live/${id.replace(/[^a-zA-Z0-9_-]/g, "")}.json`;
export async function readLive(id: string): Promise<LiveState | null> {
  const r = await get(path(id), { access: "private", useCache: false }).catch(() => null);
  if (!r || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text());
}
export async function writeLive(s: LiveState) {
  await put(path(s.id), JSON.stringify(s), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
}
/** Staff is Vapi's "user"; our shopper is "assistant"/"bot". */
export const toLine = (role: string, text: string): LiveLine | null =>
  !text?.trim() ? null : role === "user" ? { who: "Staff", text } : role === "assistant" || role === "bot" ? { who: "Caller", text } : null;
