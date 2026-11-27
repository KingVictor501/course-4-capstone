// lib/digest/marks.test.ts
// WHAT IT'S FOR: checks the mark rule (lib/digest/marks.ts) and the table default. Run with `npm test`.
// WHY THE NAME: tests for lib/digest/marks.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { getTableColumns } from "drizzle-orm";
import { appointments } from "../db/schema";
import { isReviewable, REVIEW_MARKS } from "./marks";

test("sample and recipient records may go into the review", () => {
  assert.equal(isReviewable("sample"), true);
  assert.equal(isReviewable("recipient"), true);
});

test("a test record, an unmarked record or an unknown mark never goes into the review", () => {
  assert.equal(isReviewable("test"), false);
  assert.equal(isReviewable(null), false);
  assert.equal(isReviewable(undefined), false);
  assert.equal(isReviewable(""), false);
  assert.equal(isReviewable("SAMPLE"), false);
});

test("the review list never includes test", () => {
  assert.deepEqual([...REVIEW_MARKS].sort(), ["recipient", "sample"]);
});

test("a new appointment is marked test unless someone says otherwise", () => {
  const mark = getTableColumns(appointments).mark;
  assert.equal(mark.notNull, true);
  assert.equal(mark.default, "test");
});
