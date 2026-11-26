// lib/rate-limit.ts
// WHAT IT'S FOR: rate limits ("at most N tries in M minutes") on the public front door: for now,
// signing in to the status page.
// The counts live in the database (the rate_limits table), not in server memory, because Vercel
// runs the app on many servers at once and each one's memory is separate.
//   RATE_LIMITS      every limit in one list: how many, how long, and what the visitor is told
//   clientIp         the visitor's IP address, from the header Vercel sets
//   windowStart      which time window "now" falls in (fixed windows, e.g. 10:00 to 10:15)
//   retryAfterSec    seconds until the current window ends
//   limitKey         a one-way scrambled key, so no IP address is ever stored
//   enforceRateLimit counts one try and stops the request with 429 when the limit is passed
// WHO USES IT: app/api/auth/login. Tested by lib/rate-limit.test.ts.
// WHY THE NAME: it limits the rate of requests; ".ts" = no screen code.
//
// PRIVACY: the database stores only the scrambled key and a count. Log lines name the limit
// (for example "login_ip"), never the IP address.

import { createHmac } from "node:crypto";
import { ApiError } from "./api-error";
import { log } from "./logger";

// Every limit. "max" tries are allowed per "windowMin" minutes; the next one gets 429.
// Sized so a real person never hits them, but a script hammering a form is stopped quickly.
export const RATE_LIMITS = {
  // Signing in to the status page, counted by IP, so nobody can guess the key by trying again and again.
  login_ip: { max: 30, windowMin: 15, message: "Too many sign-in attempts. Please try again in a few minutes." },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

// The visitor's IP address. On Vercel, "x-vercel-forwarded-for" (and "x-real-ip") is set by
// Vercel itself, which overwrites what a visitor sends so it can't be faked (Vercel docs:
// Request headers). If several addresses are listed, the first is the visitor's. On my computer
// there may be none, so everyone counts as "unknown" (fine for testing).
export function clientIp(headers: Headers): string {
  const raw = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip") ?? headers.get("x-forwarded-for") ?? "";
  return raw.split(",")[0]?.trim() || "unknown";
}

// The start of the time window "now" falls in. With 15-minute windows: 10:07 -> 10:00.
export function windowStart(nowMs: number, windowMin: number): Date {
  const size = windowMin * 60 * 1000;
  return new Date(Math.floor(nowMs / size) * size);
}

// Seconds until the current window ends (always at least 1), for the Retry-After header.
export function retryAfterSec(nowMs: number, windowMin: number): number {
  const end = windowStart(nowMs, windowMin).getTime() + windowMin * 60 * 1000;
  return Math.max(1, Math.ceil((end - nowMs) / 1000));
}

// A one-way scrambled key such as "login_ip:3f9a…". It uses an HMAC (a scramble with a secret
// key, here SESSION_SECRET), so even someone reading the database can't work back to the IP,
// email or phone, not even by trying every possible IP address.
export function limitKey(name: RateLimitName, subject: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(`${name}:${subject.trim().toLowerCase()}`).digest("hex").slice(0, 32);
  return `${name}:${digest}`;
}

// Counts one try against a limit and throws a 429 (with a Retry-After header) when it's over.
// "subject" is what's being counted: an IP address, an email or phone, or a user ID.
// One database statement adds the try and reads back the new count, so two requests at the same
// moment can't both slip through. If the database can't be reached this throws, and the route
// fails safely instead of running with no limit.
export async function enforceRateLimit(name: RateLimitName, subject: string): Promise<void> {
  const limit = RATE_LIMITS[name];
  const now = Date.now();
  const key = limitKey(name, subject, process.env.SESSION_SECRET ?? "");
  const start = windowStart(now, limit.windowMin);
  // getSql comes from lib/db/client.ts. Loaded here, so tests of the rules above need no database.
  const { getSql } = await import("./db/client");
  // "insert, or if this key already has a row for this window, add one to it", then return the count.
  const rows = (await getSql()`
    insert into rate_limits (key, window_start, count) values (${key}, ${start.toISOString()}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`) as { count: number }[];
  const count = Number(rows[0]?.count ?? 0);
  if (count > limit.max) {
    log.warn("rate_limited", { limit: name, max: limit.max, windowMin: limit.windowMin });
    throw new ApiError(429, "RATE_LIMITED", limit.message, { headers: { "Retry-After": String(retryAfterSec(now, limit.windowMin)) } });
  }
}
