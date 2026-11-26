// lib/auth/session.ts
// WHAT IT'S FOR: the status page's sign-in session. After someone types the right STATUS_KEY,
// the server gives their browser a signed token in a cookie. The token says only "signed in to
// the status page" and when it expires; it holds no key, name or email.
//   - The token is signed with SESSION_SECRET (from .env), so nobody can fake or edit one.
//   - The cookie is httpOnly (page scripts can't read it), Secure on the deployed site (HTTPS
//     only), and SameSite=Lax (not sent along when another site links or posts to this one).
//   - It expires after SESSION_DAYS; signing out deletes it straight away.
// HOW THE KEY REACHES THE PAGE: the key is typed into the sign-in form and sent once in the body
// of a POST over HTTPS. It is never in a link, never stored in the browser, and never logged.
// What the browser keeps is only this signed token, in the cookie above.
// WHO USES IT: app/api/auth/login and logout, and lib/auth/status-access.ts. Tested by
// lib/auth/auth.test.ts.
// WHY THE NAME: the sign-in "session"; ".ts" = no screen code.

// jwtVerify and SignJWT come from the jose package: they sign and check tokens (JWTs).
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "status_session";
export const SESSION_DAYS = 7;
const ALG = "HS256";
const ISSUER = "course-4-capstone";
// The only thing a token can say.
const SUBJECT = "status";

// The signing secret as bytes. Refuses to run with a missing or short secret.
function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  return new TextEncoder().encode(secret);
}

// Makes a signed token that says "signed in to the status page", valid for SESSION_DAYS.
export async function createSessionToken(): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: ALG }).setSubject(SUBJECT).setIssuer(ISSUER).setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(secretKey());
}

// True only for a token this server signed, that hasn't expired. Anything else (missing,
// edited, expired, signed with another secret, unsigned) is false.
export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG], issuer: ISSUER });
    return payload.sub === SUBJECT;
  } catch {
    return false;
  }
}

// The cookie settings, in one place so sign-in and sign-out match.
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
