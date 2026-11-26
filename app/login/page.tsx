// app/login/page.tsx
// WHAT IT'S FOR: the sign-in page for the status page, at /login. One box for the status key.
// A browser that's already signed in goes straight to the logs.
// WHO USES IT: the builder.
// WHY THE NAME: folder path = URL (/login).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { isSignedIn } from "@/lib/auth/status-access";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await isSignedIn()) redirect("/admin/logs");
  return (
    <main className="!max-w-sm">
      <h1>Sign in</h1>
      <p>Enter the status key to see the logs.</p>
      <LoginForm />
    </main>
  );
}
