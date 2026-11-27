CREATE TYPE "appointment_status" AS ENUM('completed', 'no_show', 'cancelled', 'waiting');--> statement-breakpoint
CREATE TYPE "audit_actor" AS ENUM('worker', 'builder', 'stranger');--> statement-breakpoint
CREATE TYPE "proposal_call" AS ENUM('deposit', 'pass', 'close_call', 'suspicious', 'mismatch');--> statement-breakpoint
CREATE TYPE "proposal_status" AS ENUM('proposed', 'approved', 'turned_down');--> statement-breakpoint
CREATE TYPE "record_mark" AS ENUM('sample', 'test', 'recipient');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"mark" "record_mark" DEFAULT 'test'::"record_mark" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"barber" text NOT NULL,
	"client_key" text NOT NULL,
	"client_first_name" text NOT NULL,
	"services" text NOT NULL,
	"service_count" integer DEFAULT 1 NOT NULL,
	"price_cents" integer NOT NULL,
	"status" "appointment_status" NOT NULL,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" "audit_actor" NOT NULL,
	"action" text NOT NULL,
	"record_id" uuid,
	"rows" integer
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"week_start" date NOT NULL,
	"client_key" text NOT NULL,
	"call" "proposal_call" NOT NULL,
	"reason" text NOT NULL,
	"status" "proposal_status" DEFAULT 'proposed'::"proposal_status" NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"paused" boolean DEFAULT true NOT NULL,
	"no_show_strikes" integer DEFAULT 2 NOT NULL,
	"long_gap_days" integer DEFAULT 49 NOT NULL,
	"max_long_gaps_per_year" integer DEFAULT 2 NOT NULL,
	"skip_holiday_gaps" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_one_row" CHECK (id = 1)
);
--> statement-breakpoint
CREATE INDEX "appointments_mark_starts_idx" ON "appointments" ("mark","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_client_idx" ON "appointments" ("client_key","starts_at");--> statement-breakpoint
CREATE INDEX "audit_ts_idx" ON "audit" ("ts");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_week_client_idx" ON "proposals" ("week_start","client_key");--> statement-breakpoint
-- The one settings row (paused, with Ben's rule numbers). Safe to run again.
INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
