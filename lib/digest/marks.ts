// lib/digest/marks.ts
// WHAT IT'S FOR: the one rule about record marks. Only records marked "sample" or "recipient"
// can ever reach Ben's review; "test" records (and anything unmarked, which defaults to test)
// never do. Every read the worker makes goes through inReview(), so the rule lives in one place.
// WHO USES IT: the door's read ability (added in step 5), and lib/digest/marks.test.ts.
// WHY THE NAME: the rules about marks; ".ts" = no screen code.

import { inArray } from "drizzle-orm";
// The appointments table, so the filter knows which column to check.
import { appointments } from "../db/schema";

export type RecordMark = "sample" | "test" | "recipient";

// The marks allowed into Ben's review. "test" is deliberately missing.
export const REVIEW_MARKS = ["sample", "recipient"] as const satisfies readonly RecordMark[];

// True only for a mark that may go into the review.
export function isReviewable(mark: string | null | undefined): boolean {
  return (REVIEW_MARKS as readonly string[]).includes(mark ?? "");
}

// The database filter version of the same rule: "mark is sample or recipient".
export function inReview() {
  return inArray(appointments.mark, [...REVIEW_MARKS]);
}
