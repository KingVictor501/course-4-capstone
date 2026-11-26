// components/SiteHeader.tsx
// WHAT IT'S FOR: the bar across the top of every page: the app's name (a link home) and, once
// this browser is signed in to the status page, the Logs link and Log out. Signed out, it shows
// only "Sign in". A server component: it checks the sign-in on the server, then hands the links
// to NavMenu (the only part that runs in the browser, for the active link and the phone menu).
// WHO USES IT: app/layout.tsx.
// WHY THE NAME: the site's header; ".tsx" = screen code.

import Link from "next/link";
import { isSignedIn } from "@/lib/auth/status-access";
import NavMenu, { type NavLink } from "./NavMenu";

const SIGNED_IN: NavLink[] = [{ href: "/admin/logs", label: "Logs" }];
const SIGNED_OUT: NavLink[] = [{ href: "/login", label: "Sign in" }];

export default async function SiteHeader() {
  const signedIn = await isSignedIn();
  return (
    <div className="relative border-b border-border bg-bg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight !no-underline">
          Weekly Digest
        </Link>
        <NavMenu links={signedIn ? SIGNED_IN : SIGNED_OUT} who={signedIn ? "Signed in" : null} />
      </div>
    </div>
  );
}
