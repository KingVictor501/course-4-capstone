// lib/digest/rules.ts
// WHAT IT'S FOR: Ben's consistency rule, as plain date maths (no database):
//   daysBetween         whole days from one date to another
//   holidaySeason       Thanksgiving Day through New Year's Day for a given year
//   overlapsHoliday     does a gap between two visits touch that season?
//   countLongGaps       how many gaps of 7+ weeks a client has, skipping holiday gaps when asked
// WHO USES IT: the weekly Digest (later steps), and the first-batch checks in lib/digest/batch.test.ts.
// WHY THE NAME: the rules the worker applies; ".ts" = no screen code.
//
// Dates are local shop dates written "YYYY-MM-DD", so time zones and clock changes can't shift them.

// A local date, e.g. "2026-11-20".
export type LocalDate = string;

const DAY_MS = 24 * 60 * 60 * 1000;

// Turns "2026-11-20" into midnight UTC on that day, only so two dates can be subtracted.
function toUtc(d: LocalDate): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

// Whole days from a to b (positive when b is later).
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

// Day of the week: 0 = Sunday ... 6 = Saturday.
export function weekday(d: LocalDate): number {
  return new Date(toUtc(d)).getUTCDay();
}

// Thanksgiving (the fourth Thursday of November) through January 1 of the next year.
export function holidaySeason(year: number): { from: LocalDate; to: LocalDate } {
  const firstDay = new Date(Date.UTC(year, 10, 1)).getUTCDay(); // November 1
  const firstThursday = 1 + ((4 - firstDay + 7) % 7);
  const day = firstThursday + 21;
  return { from: `${year}-11-${String(day).padStart(2, "0")}`, to: `${year + 1}-01-01` };
}

// True when the stretch from one visit to the next touches a holiday season.
export function overlapsHoliday(from: LocalDate, to: LocalDate): boolean {
  const startYear = Number(from.slice(0, 4));
  // A gap can touch the season that starts in its first year, or the one before it (which runs into January).
  for (const year of [startYear - 1, startYear]) {
    const season = holidaySeason(year);
    if (from <= season.to && to >= season.from) return true;
  }
  return false;
}

// Counts the gaps of longGapDays or more between a client's visits (dates in any order).
// With skipHolidayGaps on, a gap that touches the holiday season doesn't count.
export function countLongGaps(dates: LocalDate[], opts: { longGapDays: number; skipHolidayGaps: boolean }): number {
  const sorted = [...new Set(dates)].sort();
  let count = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = daysBetween(sorted[i - 1], sorted[i]);
    if (gap < opts.longGapDays) continue;
    if (opts.skipHolidayGaps && overlapsHoliday(sorted[i - 1], sorted[i])) continue;
    count++;
  }
  return count;
}
