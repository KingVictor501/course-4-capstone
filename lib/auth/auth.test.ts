// lib/auth/auth.test.ts
// WHAT IT'S FOR: automated checks of the status page's sign-in session (no database, no browser):
// a signed token checks out; an edited, expired, wrong-secret or unsigned token is refused; the
// cookie is httpOnly and SameSite=Lax, and Secure in production.
// Run with `npm test`.
// WHY THE NAME: tests for everything in lib/auth/.

import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
// SignJWT (from jose) lets the tests make expired or wrong tokens on purpose.
import { SignJWT } from "jose";
import { createSessionToken, isValidSessionToken, sessionCookieOptions } from "./session";

const SECRET = "test-session-secret-that-is-at-least-32-chars";
const original = { secret: process.env.SESSION_SECRET, env: process.env.NODE_ENV };
beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
});
afterEach(() => {
  if (original.secret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = original.secret;
  (process.env as Record<string, string | undefined>).NODE_ENV = original.env;
});

test("a token this server signed checks out", async () => {
  assert.equal(await isValidSessionToken(await createSessionToken()), true);
});

test("an edited token is refused", async () => {
  const [header, payload, signature] = (await createSessionToken()).split(".");
  const claims = JSON.parse(Buffer.from(payload ?? "", "base64url").toString());
  claims.exp = claims.exp + 10 * 365 * 24 * 3600;
  const forged = [header, Buffer.from(JSON.stringify(claims)).toString("base64url"), signature].join(".");
  assert.equal(await isValidSessionToken(forged), false);
});

test("a token signed with a different secret is refused", async () => {
  const token = await createSessionToken();
  process.env.SESSION_SECRET = "a-completely-different-secret-of-32-plus-chars";
  assert.equal(await isValidSessionToken(token), false);
});

test("an expired token is refused", async () => {
  const expired = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("status")
    .setIssuer("course-4-capstone")
    .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(SECRET));
  assert.equal(await isValidSessionToken(expired), false);
});

test("an unsigned token (alg none), garbage and no token are refused", async () => {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "status", iss: "course-4-capstone" })).toString("base64url");
  assert.equal(await isValidSessionToken(`${header}.${payload}.`), false);
  assert.equal(await isValidSessionToken("garbage"), false);
  assert.equal(await isValidSessionToken(undefined), false);
});

test("a short or missing SESSION_SECRET refuses to sign", async () => {
  process.env.SESSION_SECRET = "too-short";
  await assert.rejects(createSessionToken());
});

test("the cookie is httpOnly and SameSite=Lax, and Secure on the deployed site", () => {
  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  const prod = sessionCookieOptions(60);
  assert.equal(prod.httpOnly, true);
  assert.equal(prod.secure, true);
  assert.equal(prod.sameSite, "lax");
  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  assert.equal(sessionCookieOptions(60).secure, false, "plain http on localhost");
});
