// lib/status/data.ts
// WHAT IT'S FOR: the database side of the status page.
//   searchLogs  log lines, newest first, filtered by level, event, route and time range
// Only called after the sign-in check (lib/auth/status-access.ts).
// WHO USES IT: the status page. The filter rules are in lib/status/rules.ts (tested).
// WHY THE NAME: status page data; ".ts" = no screen code.

import { and, desc, eq, gte, ilike, lt, ne, type SQL } from "drizzle-orm";
import { getDb } from "../db/client";
import { logEntries } from "../db/schema";
import type { LogFilters } from "./rules";

// One log line as the page shows it (the time as text, ready to print).
export type LogRow = { id: string; ts: string; level: string; event: string; route: string | null; requestId: string | null; details: unknown };

// Log lines matching the filters, newest first, at most "limit".
export async function searchLogs(filters: LogFilters, now: Date = new Date(), limit = 200): Promise<LogRow[]> {
  const where: SQL[] = [gte(logEntries.ts, new Date(now.getTime() - filters.rangeHours * 3600 * 1000))];
  if (filters.level) where.push(eq(logEntries.level, filters.level));
  // "%" means "anything" in a LIKE search; the typed text is passed as a value, never as SQL.
  if (filters.event) where.push(ilike(logEntries.event, `%${filters.event}%`));
  if (filters.route) where.push(ilike(logEntries.route, `%${filters.route}%`));
  if (filters.hideDebug && !filters.level) where.push(ne(logEntries.level, "debug"));
  const rows = await getDb()
    .select()
    .from(logEntries)
    .where(and(...where, lt(logEntries.ts, new Date(now.getTime() + 60_000))))
    .orderBy(desc(logEntries.ts))
    .limit(limit);
  return rows.map((r) => ({ ...r, ts: r.ts.toISOString() }));
}
