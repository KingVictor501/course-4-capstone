// lib/db/schema.ts
// WHAT IT'S FOR: describes the database TABLES in TypeScript:
//   - log_entries: the saved log lines (every request's edges and every error, already redacted).
//   - rate_limits: counters for the rate limiter, so limits work across servers.
// The weekly Digest's own tables (appointments, proposals, audit, settings) are added next.
// WHO USES IT: lib/db/client.ts (so queries know the tables), lib/logger.ts (saves log rows),
// lib/rate-limit.ts, and drizzle-kit (reads this file to write the migration SQL in /drizzle).
// WHY THE NAME: "schema" = the blueprint of a database; ".ts" = no screen code.

// These builders come from Drizzle (drizzle-orm): one per kind of column.
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

// One row per log line. Never holds names, emails, phones, or raw request bodies:
// lib/redact.ts cleans everything before it gets here.
export const logEntries = pgTable(
  "log_entries",
  {
    // A random unique id for the row, made by the database.
    id: uuid("id").defaultRandom().primaryKey(),
    // When it happened. "withTimezone" = stored as an exact moment.
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    // debug, info, warn or error.
    level: text("level").notNull(),
    // The event name, e.g. request_done. A fact label, not a sentence.
    event: text("event").notNull(),
    // The route pattern, e.g. /api/health. Empty when the line isn't about a request.
    route: text("route"),
    // Ties together the lines from one request.
    requestId: text("request_id"),
    // Everything else (method, status, ms, ...), already cleaned by redaction.
    details: jsonb("details"),
  },
  // Indexes = a book's index: they make the dashboard's "newest first" and "filter by level/event" fast.
  (table) => [
    index("log_entries_ts_idx").on(table.ts),
    index("log_entries_level_ts_idx").on(table.level, table.ts),
    index("log_entries_event_ts_idx").on(table.event, table.ts),
  ],
);

// Rate limit counters (lib/rate-limit.ts): one row per limit, per visitor, per time window.
// "key" is a one-way scramble of the limit name and the IP address, so nothing
// personal is stored. Rows older than a day are deleted (lib/logger.ts, with the log pruning).
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    // When this time window began (for example 10:00 for a 15-minute window from 10:00 to 10:15).
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    // How many tries so far in this window.
    count: integer("count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] }), index("rate_limits_window_idx").on(t.windowStart)],
);
