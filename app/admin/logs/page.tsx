// app/admin/logs/page.tsx
// WHAT IT'S FOR: the log viewer, at /admin/logs: the saved log lines, newest first, filterable by
// level, event, route and time range. Click a line to see its details. Behind the status page
// sign-in: a browser that isn't signed in is sent to /login.
// WHO USES IT: the builder, to watch what the app and the worker are doing.
// WHY THE NAME: folder path = URL (/admin/logs).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth/status-access";
import { searchLogs } from "@/lib/status/data";
import { LOG_LEVELS, LOG_RANGES, parseLogFilters } from "@/lib/status/rules";

export const metadata: Metadata = { title: "Logs", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LEVEL_STYLE: Record<string, string> = {
  debug: "text-text-muted",
  info: "text-text",
  warn: "font-semibold text-level-warn",
  error: "font-semibold text-level-error",
};

export default async function LogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Only a signed-in browser sees the logs.
  if (!(await isSignedIn())) redirect("/login");

  const filters = parseLogFilters(await searchParams);
  const rows = await searchLogs(filters);

  return (
    <main className="!max-w-6xl">
      <h1 className="!mt-2">Logs</h1>

      <form method="get" className="grid gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-5 sm:items-end">
        <label className="flex flex-col gap-1">
          <span>Level</span>
          <select name="level" defaultValue={filters.level ?? ""}>
            <option value="">Any</option>
            {LOG_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l[0]!.toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>Event</span>
          <input name="event" defaultValue={filters.event ?? ""} placeholder="request_failed" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Route</span>
          <input name="route" defaultValue={filters.route ?? ""} placeholder="/api/mcp" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Time</span>
          <select name="range" defaultValue={filters.range}>
            {Object.entries(LOG_RANGES).map(([k, r]) => (
              <option key={k} value={k}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="debug" value="1" defaultChecked={!filters.hideDebug} />
            <span>Include debug</span>
          </label>
          <button type="submit">Filter</button>
        </div>
      </form>

      <p className="text-sm">
        {rows.length === 200 ? "Newest 200 lines" : `${rows.length} ${rows.length === 1 ? "line" : "lines"}`} · newest first. Logs are kept 14 days.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-3">No log lines match. Try a longer time range or fewer filters.</p>
      ) : (
        <ul className="!list-none !p-0 grid gap-1">
          {rows.map((r) => (
            <li key={r.id} className="rounded border border-border bg-bg">
              <details>
                <summary className="flex cursor-pointer flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-text-muted">{new Date(r.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                  <span className={`w-12 uppercase ${LEVEL_STYLE[r.level] ?? ""}`}>{r.level}</span>
                  <span className="font-mono text-text">{r.event}</span>
                  {r.route && <span className="font-mono text-text-muted">{r.route}</span>}
                </summary>
                {/* JSON shown as plain text; React escapes it, so nothing in a log line can run. */}
                <pre className="!m-0 overflow-x-auto border-t border-border bg-surface px-3 py-2 text-xs">
                  {JSON.stringify({ requestId: r.requestId, details: r.details }, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
