// lib/keys.ts
// WHAT IT'S FOR: isValidKey, the one safe way this app compares a key someone sent with the
// secret it expects (the door's key, the status page's sign-in key). It takes the same time
// whether the guess is close or not, so nobody can work the key out by timing the answers.
// WHO USES IT: lib/mcp-auth.ts (the door) and app/api/auth/login (the status page sign-in).
// Tested by lib/keys.test.ts.
// WHY THE NAME: key checks; ".ts" = no screen code.

// createHash and timingSafeEqual come from Node's built-in crypto module.
import { createHash, timingSafeEqual } from "node:crypto";

// True only if "provided" matches "expected". Missing or empty on either side is always false,
// so a server with no key configured never lets anyone in.
export function isValidKey(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  // Hash both first so they always have the same length (timingSafeEqual requires equal lengths).
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
