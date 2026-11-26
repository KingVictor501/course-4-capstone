// components/LoginForm.tsx
// WHAT IT'S FOR: the sign-in form on /login: one password-style box for the status key and a
// Sign in button. It sends the key once to POST /api/auth/login and, if the server accepts it,
// goes to the logs. The key is never put in the address bar or saved in the browser.
// WHO USES IT: app/login/page.tsx.
// WHY THE NAME: the login form; ".tsx" = screen code. "use client" because it has a form and
// "Signing in…" states.

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sends the key, then goes to the logs, or shows the server's short message.
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message: string } };
        setError(body.error?.message ?? "Couldn't sign in. Try again.");
        return;
      }
      setKey("");
      router.push("/admin/logs");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span>Status key</span>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && (
        <p role="alert" className="m-0 rounded border border-border bg-surface p-2 text-sm text-text">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
