// scripts/load-batch.ts
// WHAT IT'S FOR: writes the first batch (lib/digest/batch.ts) into the database: the reviewed
// week, the older visits, and the one planted test record. Safe to run again: each record has a
// fixed ID, so a second run updates the same rows instead of adding copies.
// WHO USES IT: `npm run batch:load`, by me, the builder. It uses whatever DATABASE_URL is set
// (.env.local on my computer). It never prints the connection string or any record.
// WHY THE NAME: a "script" is a one-off command-line program, so it sits in /scripts; ".ts" = no screen code.

import { sql } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { appointments, audit } from "../lib/db/schema";
import { BATCH, batchCounts, recordId, startsAt } from "../lib/digest/batch";
import { log } from "../lib/logger";

// Load .env.local for local runs (built into Node). Does not overwrite variables already set.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local. getDb() will stop with "DATABASE_URL is not set" if nothing else set it.
}

async function main(): Promise<void> {
  const db = getDb();
  const rows = BATCH.map((r) => ({
    id: recordId(r.key),
    mark: r.mark,
    startsAt: startsAt(r),
    barber: r.barber,
    clientKey: r.clientKey,
    clientFirstName: r.clientFirstName,
    services: r.services,
    serviceCount: r.serviceCount,
    priceCents: r.priceCents,
    status: r.status,
    noShowCount: r.noShowCount,
    note: r.note,
  }));

  // Insert, or update the row with the same ID if it's already there.
  // "excluded" is Postgres's name for the row we just tried to insert.
  await db
    .insert(appointments)
    .values(rows)
    .onConflictDoUpdate({
      target: appointments.id,
      set: {
        mark: sql`excluded.mark`,
        startsAt: sql`excluded.starts_at`,
        barber: sql`excluded.barber`,
        clientKey: sql`excluded.client_key`,
        clientFirstName: sql`excluded.client_first_name`,
        services: sql`excluded.services`,
        serviceCount: sql`excluded.service_count`,
        priceCents: sql`excluded.price_cents`,
        status: sql`excluded.status`,
        noShowCount: sql`excluded.no_show_count`,
        note: sql`excluded.note`,
      },
    });

  // One audit line for the touch: who, what, how many rows. Never a record's contents.
  await db.insert(audit).values({ actor: "builder", action: "load-batch", rows: rows.length });

  const counts = batchCounts();
  log.info("batch_loaded", counts);
}

main().catch((err: unknown) => {
  log.error("batch_load_failed", { message: err instanceof Error ? err.message : "unknown error" });
  process.exitCode = 1;
});
