import { timingSafeEqual } from "crypto";
/** LIVE mode needs LIVE_ACCESS_CODE configured and the same code sent in the x-live-code header. */
export function liveCodeOk(req: Request) {
  const want = process.env.LIVE_ACCESS_CODE || "";
  const got = req.headers.get("x-live-code") || "";
  if (!want || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
const hits = new Map<string, number[]>();
/** Simple per-IP sliding-window limit (in-memory, per server instance). */
export function rateOk(req: Request, max = 5, windowMs = 60 * 60 * 1000) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now(); const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { hits.set(ip, arr); return false; }
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return true;
}
