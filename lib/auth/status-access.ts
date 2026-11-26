// lib/auth/status-access.ts
// WHAT IT'S FOR: "is this browser signed in to the status page?" Reads the session cookie and
// checks its signature (lib/auth/session.ts). Used by every page and route behind the sign-in.
// WHO USES IT: the status page, app/login/page.tsx and components/SiteHeader.tsx.
// WHY THE NAME: access to the status page; ".ts" = no screen code.

// cookies() (from Next.js) reads the cookies the browser sent with this request.
import { cookies } from "next/headers";
import { isValidSessionToken, SESSION_COOKIE } from "./session";

// True if this request carries a valid status-page session.
export async function isSignedIn(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value);
}
