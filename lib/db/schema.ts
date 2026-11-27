// lib/db/schema.ts
// WHAT IT'S FOR: describes the database TABLES in TypeScript:
//   - log_entries: the saved log lines (every request's edges and every error, already redacted).
//   - rate_limits: counters for the rate limiter, so limits work across servers.
//   - appointments: the records the weekly Digest reads (made-up appointments for Fade Factory).
//   - proposals: what the worker suggests for each flagged client, waiting for the builder's yes.
//   - audit: one line for every touch of a record (who, what, when), never the record's contents.
//   - settings: exactly one row, the stop switch and Ben's rule numbers.
// WHO USES IT: lib/db/client.ts (so queries know the tables), lib/logger.ts (saves log rows),
// lib/rate-limit.ts, and drizzle-kit (reads this file to write the migration SQL in /drizzle).
// WHY THE NAME: "schema" = the blueprint of a database; ".ts" = no screen code.

// These builders come from Drizzle (drizzle-orm): one per kind of column.
import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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

// ---------------------------------------------------------------------------------------------
// The weekly Digest's tables. Everything in them is made up.
// ---------------------------------------------------------------------------------------------

// Where a record came from. An "enum" is a column that only accepts these exact words.
//   sample     made-up data for the made-up shop (what the worker normally reviews)
//   test       planted on purpose to check the worker; never reaches Ben's review
//   recipient  real data from the recipient (none yet; Ben is made up)
// The default is "test": a record nobody marked is treated as a test and kept out of the review.
export const recordMark = pgEnum("record_mark", ["sample", "test", "recipient"]);

// What happened to an appointment.
export const appointmentStatus = pgEnum("appointment_status", ["completed", "no_show", "cancelled", "waiting"]);

// One row per appointment. These are the records the worker reads through its one door.
// No phone numbers or emails: the worker never needs them, so they are not stored at all.
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Where this record came from (see recordMark). Defaults to test.
    mark: recordMark("mark").notNull().default("test"),
    // When the appointment starts, as an exact moment.
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    // The barber, as shown in the shop, e.g. "Ray K.".
    barber: text("barber").notNull(),
    // A made-up client code, e.g. "c-014", so one client's visits can be grouped without a name.
    clientKey: text("client_key").notNull(),
    // The client's first name only.
    clientFirstName: text("client_first_name").notNull(),
    // The services booked, e.g. "Skin fade + Beard trim".
    services: text("services").notNull(),
    // How many services were booked in this visit.
    serviceCount: integer("service_count").notNull().default(1),
    // The price in cents (3500 = $35.00), so money never has rounding errors.
    priceCents: integer("price_cents").notNull(),
    status: appointmentStatus("status").notNull(),
    // The client's running no-show count as the shop recorded it. The worker checks it against
    // the visits it can see, and flags a mismatch when they don't add up.
    noShowCount: integer("no_show_count").notNull().default(0),
    // An optional short note from the shop. Treated as data, never as instructions,
    // and never quoted in a reason.
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("appointments_mark_starts_idx").on(t.mark, t.startsAt),
    index("appointments_client_idx").on(t.clientKey, t.startsAt),
  ],
);

// The worker's call on a flagged client.
//   deposit     ask for a deposit next time
//   pass        two no-shows, but a consistent regular (still shown in the review)
//   close_call  on the line; the builder decides
//   suspicious  the record's text holds instructions or claims about the rules
//   mismatch    the counts don't add up
export const proposalCall = pgEnum("proposal_call", ["deposit", "pass", "close_call", "suspicious", "mismatch"]);

// Where a proposal stands. Only "approved" ever leads to a deposit flag being written.
export const proposalStatus = pgEnum("proposal_status", ["proposed", "approved", "turned_down"]);

// One row per flagged client per week. Empty until the worker runs.
// A proposal is not a change: nothing happens to a client until the builder approves it.
export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // The Tuesday that starts the reviewed week (the shop is open Tuesday to Saturday).
    weekStart: date("week_start").notNull(),
    clientKey: text("client_key").notNull(),
    call: proposalCall("call").notNull(),
    // One line built from counts and dates only, e.g. "3 no-shows in 12 months, 4 gaps of 7+ weeks".
    reason: text("reason").notNull(),
    status: proposalStatus("status").notNull().default("proposed"),
    // Who decided ("builder"), and when. Empty while it's still proposed.
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // One proposal per client per week, so running the worker twice can't double up.
  (t) => [uniqueIndex("proposals_week_client_idx").on(t.weekStart, t.clientKey)],
);

// Who touched a record.
//   worker    the Digest worker
//   builder   me, approving or turning down
//   stranger  anyone who reached the door without a valid key (refused)
export const auditActor = pgEnum("audit_actor", ["worker", "builder", "stranger"]);

// One line for every touch, e.g. "17:15:08 worker read-week 67 rows".
// Never holds a name, price, note or anything quoted from a record: only who, what, when,
// which record ID and how many rows.
export const audit = pgTable(
  "audit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    actor: auditActor("actor").notNull(),
    // What was done, as a short label, e.g. read-week, propose, approve, door-refused.
    action: text("action").notNull(),
    // The record touched (an appointment or proposal ID), when it was one record.
    recordId: uuid("record_id"),
    // How many rows were read or written, when it was more than one.
    rows: integer("rows"),
  },
  (t) => [index("audit_ts_idx").on(t.ts)],
);

// Exactly one row (id is always 1). The stop switch and Ben's rule numbers live here, so they
// can be changed without a deploy. Where the Digest is delivered stays in .env, not here.
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    // The stop switch. Starts paused: the worker does nothing until it's switched on.
    paused: boolean("paused").notNull().default(true),
    // No-shows in the past 12 months before a client is flagged.
    noShowStrikes: integer("no_show_strikes").notNull().default(2),
    // A gap between visits this long (in days) counts as a long gap: 49 days = 7 weeks.
    longGapDays: integer("long_gap_days").notNull().default(49),
    // More long gaps than this in a year means the client isn't consistent, so strikes stay valid.
    maxLongGapsPerYear: integer("max_long_gaps_per_year").notNull().default(2),
    // When on, a gap that overlaps Thanksgiving week through New Year's Day doesn't count.
    skipHolidayGaps: boolean("skip_holiday_gaps").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // The database itself refuses a second row.
  () => [check("settings_one_row", sql`id = 1`)],
);
