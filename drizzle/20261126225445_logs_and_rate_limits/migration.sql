CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"event" text NOT NULL,
	"route" text,
	"request_id" text,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text,
	"window_start" timestamp with time zone,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rate_limits_pkey" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE INDEX "log_entries_ts_idx" ON "log_entries" ("ts");--> statement-breakpoint
CREATE INDEX "log_entries_level_ts_idx" ON "log_entries" ("level","ts");--> statement-breakpoint
CREATE INDEX "log_entries_event_ts_idx" ON "log_entries" ("event","ts");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" ("window_start");