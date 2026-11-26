// lib/status/status.test.ts
// WHAT IT'S FOR: automated checks of the status page's rules (no database): reading the log
// viewer's filters from the URL safely. Run with `npm test`.
// WHY THE NAME: tests for lib/status/.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLogFilters } from "./rules";

test("log filters are read safely from the URL", () => {
  const f = parseLogFilters({ level: "error", event: " request_failed ", route: "/api/mcp", range: "7d" });
  assert.equal(f.level, "error");
  assert.equal(f.event, "request_failed", "trimmed");
  assert.equal(f.rangeHours, 24 * 7);
  assert.equal(f.hideDebug, true, "debug hidden unless asked for");
  const bad = parseLogFilters({ level: "loud", range: "forever", event: "x".repeat(500) });
  assert.equal(bad.level, null, "an unknown level is ignored");
  assert.equal(bad.range, "24h", "an unknown range falls back to 24 hours");
  assert.equal(bad.event?.length, 80, "long text is capped");
  assert.equal(parseLogFilters({ debug: "1" }).hideDebug, false);
});
