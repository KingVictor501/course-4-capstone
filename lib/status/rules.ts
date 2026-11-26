// lib/status/rules.ts
// WHAT IT'S FOR: the status page's rules that need no database, so they're tested exactly:
//   parseLogFilters  turns the log viewer's URL (?level=error&event=...&range=24h) into safe
//                    filters; anything unknown is ignored rather than trusted
// WHO USES IT: lib/status/data.ts and the status page. Tested by lib/status/status.test.ts.
// WHY THE NAME: status page rules; ".ts" = no screen code.

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

// The time ranges the log viewer offers, in hours.
export const LOG_RANGES: Record<string, { hours: number; label: string }> = {
  "1h": { hours: 1, label: "Last hour" },
  "24h": { hours: 24, label: "Last 24 hours" },
  "7d": { hours: 24 * 7, label: "Last 7 days" },
  "14d": { hours: 24 * 14, label: "Last 14 days" },
};

export type LogFilters = { level: LogLevel | null; event: string | null; route: string | null; range: string; rangeHours: number; hideDebug: boolean };

// Reads the filters from the URL. Text is trimmed and capped; a level, range or shop ID that
// isn't valid is dropped. Debug lines are hidden unless asked for, since they're the noisiest.
export function parseLogFilters(params: Record<string, string | string[] | undefined>): LogFilters {
  const one = (key: string) => {
    const v = params[key];
    const s = (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
    return s ? s.slice(0, 80) : null;
  };
  const level = one("level");
  const range = one("range") ?? "24h";
  const r = LOG_RANGES[range] ?? LOG_RANGES["24h"]!;
  return {
    level: (LOG_LEVELS as readonly string[]).includes(level ?? "") ? (level as LogLevel) : null,
    event: one("event"),
    route: one("route"),
    range: LOG_RANGES[range] ? range : "24h",
    rangeHours: r.hours,
    hideDebug: one("debug") !== "1",
  };
}
