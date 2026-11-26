// app/api/auth/login/route.ts
// WHAT IT'S FOR: POST /api/auth/login with { key } signs a browser in to the status page. The
// key is compared with STATUS_KEY from .env (lib/keys.ts, constant time). If it matches, the
// browser gets a signed session cookie (lib/auth/session.ts) and the key itself is forgotten.
// A wrong key always gets the same short answer, and tries are rate-limited by IP.
// WHO USES IT: components/LoginForm.tsx.
// WHY THE NAME: folder path = URL (/api/auth/login).
//
// PRIVACY: logs status_sign_in with ok: true or false only. Never the key, never the body.

import { cookies } from "next/headers";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS, sessionCookieOptions } from "@/lib/auth/session";
import { isValidKey } from "@/lib/keys";
import { log } from "@/lib/logger";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";
import { withLogging } from "@/lib/with-logging";

export const dynamic = "force-dynamic";

// What the form may send: the key, and nothing else.
const body = z.object({ key: z.string().min(1).max(200) }).strict();

export const POST = withLogging("/api/auth/login", async (request) => {
  // Rate limit by IP first, before the key is even looked at, so guessing is slow.
  await enforceRateLimit("login_ip", clientIp(request.headers));
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "BAD_INPUT", "Enter the status key.");

  const expected = process.env.STATUS_KEY;
  if (!expected) {
    // No key on the server: nobody can sign in, rather than everybody.
    log.error("status_key_not_configured", {});
    throw new ApiError(503, "NOT_CONFIGURED", "Sign-in isn't available right now.");
  }
  const ok = isValidKey(parsed.data.key, expected);
  log.info("status_sign_in", { ok });
  if (!ok) throw new ApiError(401, "INVALID_KEY", "That key didn't work.");

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions(SESSION_DAYS * 24 * 60 * 60));
  return Response.json({ ok: true });
});
