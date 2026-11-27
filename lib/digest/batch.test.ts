// lib/digest/batch.test.ts
// WHAT IT'S FOR: checks the first batch (lib/digest/batch.ts) says what it claims to say, and checks
// the consistency rule (lib/digest/rules.ts) on it. No database needed. Run with `npm test`.
// WHY THE NAME: tests for lib/digest/batch.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { findInjectionRule } from "../injection";
import { BATCH, batchCounts, recordId, REVIEW_WEEK, startsAt, type BatchRecord } from "./batch";
import { isReviewable } from "./marks";
import { countLongGaps, holidaySeason, weekday } from "./rules";

const ben = { longGapDays: 49, skipHolidayGaps: true };
const datesOf = (clientKey: string) => BATCH.filter((r) => r.clientKey === clientKey).map((r) => r.date);
const inWeek = (r: BatchRecord) => r.date >= REVIEW_WEEK.from && r.date <= REVIEW_WEEK.to;

test("the reviewed week has 10 sample records, and there is exactly one test record", () => {
  const c = batchCounts();
  assert.equal(c.week, 10);
  assert.equal(c.test, 1);
  assert.equal(c.total, c.week + c.history + c.test);
});

test("every record carries a mark, and only the test record is kept out of the review", () => {
  const out = BATCH.filter((r) => !isReviewable(r.mark));
  assert.equal(out.length, 1);
  assert.equal(out[0].mark, "test");
  assert.ok(BATCH.every((r) => r.mark === "sample" || r.mark === "test"));
});

test("every visit falls Tuesday to Saturday, and no client has two visits on one day", () => {
  for (const r of BATCH) assert.ok(weekday(r.date) >= 2 && weekday(r.date) <= 6, r.key);
  const keys = BATCH.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(new Set(keys.map(recordId)).size, keys.length);
});

test("IDs are fixed, so loading twice can't duplicate", () => {
  assert.equal(recordId("c-001:2026-11-20"), recordId("c-001:2026-11-20"));
  assert.match(recordId("c-001:2026-11-20"), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("times are Central: 11:00 on 20 Nov is 17:00 UTC, 11:00 on 22 May is 16:00 UTC", () => {
  const nov = BATCH.find((r) => r.key === "c-001:2026-11-20")!;
  const may = BATCH.find((r) => r.key === "c-001:2026-05-22")!;
  assert.equal(startsAt(nov).toISOString(), "2026-11-20T17:00:00.000Z");
  assert.equal(startsAt(may).toISOString(), "2026-05-22T16:00:00.000Z");
});

test("no record has a phone number or email in it", () => {
  const text = JSON.stringify(BATCH);
  assert.doesNotMatch(text, /@|\b\d{3}[-.\s]\d{4}\b/);
});

test("Thanksgiving is the fourth Thursday of November", () => {
  assert.deepEqual(holidaySeason(2025), { from: "2025-11-27", to: "2026-01-01" });
  assert.deepEqual(holidaySeason(2026), { from: "2026-11-26", to: "2027-01-01" });
});

test("Andre is consistent: no long gaps, 2 no-shows", () => {
  assert.equal(countLongGaps(datesOf("c-001"), ben), 0);
  assert.equal(BATCH.filter((r) => r.clientKey === "c-001" && r.status === "no_show").length, 2);
});

test("Jalen's strikes stay valid: four long gaps outside the holidays, 3 no-shows", () => {
  assert.equal(countLongGaps(datesOf("c-002"), ben), 4);
  assert.equal(countLongGaps(datesOf("c-002"), { ...ben, skipHolidayGaps: false }), 5);
});

test("Marco is on the line: only one long gap, but he's slowed from every 2 weeks", () => {
  assert.equal(countLongGaps(datesOf("c-003"), ben), 1);
});

test("Tyler is saved by the holiday rule: 2 long gaps with it, 3 without", () => {
  assert.equal(countLongGaps(datesOf("c-004"), ben), 2);
  assert.equal(countLongGaps(datesOf("c-004"), { ...ben, skipHolidayGaps: false }), 3);
});

test("Chris's counts don't add up: recorded 4, only 2 no-shows exist", () => {
  const rows = BATCH.filter((r) => r.clientKey === "c-005");
  const real = rows.filter((r) => r.status === "no_show").length;
  const last = rows.find((r) => inWeek(r))!;
  assert.equal(real, 2);
  assert.notEqual(last.noShowCount, real);
});

test("Sam's note is caught as instructions, and no other sample note is", () => {
  const flagged = BATCH.filter((r) => r.mark === "sample" && r.note && findInjectionRule(r.note));
  assert.deepEqual(flagged.map((r) => r.clientKey), ["c-006"]);
});
