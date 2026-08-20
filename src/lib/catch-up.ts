import type { Expense } from "./types";
import { localDateInputValue, parseFinancialDate } from "./utils";

/** How many missing days one pass through the flow offers. */
export const CATCH_UP_WINDOW_DAYS = 7;
/** How long a "nothing spent" answer is kept before it is forgotten. */
export const REVIEWED_RETENTION_DAYS = 90;

export interface CatchUpQueue {
  /** Missing days, oldest first, capped at the window. */
  days: string[];
  /** Missing days beyond the window. */
  olderCount: number;
  lastRecordedDay: string | null;
}

/**
 * The local calendar day a timestamp belongs to.
 *
 * Going through `parseFinancialDate` matters: slicing an ISO string would file
 * an expense recorded at 00:25 under the previous day for anyone east of UTC,
 * and the whole feature is about which days are empty.
 */
export function dayKey(iso: string): string {
  return localDateInputValue(parseFinancialDate(iso));
}

export function expensesOnDay(expenses: Expense[], day: string): Expense[] {
  return expenses.filter((expense) => dayKey(expense.date) === day);
}

/**
 * Days between the last recorded expense and today that hold nothing.
 *
 * Bounded at `limit` so returning from a month away offers a week's work rather
 * than a wall of thirty prompts; the rest is reported as `olderCount` and
 * offered once the first pass is done.
 */
export function missingDays({
  expenses,
  reviewedDates = [],
  today = new Date(),
  limit = CATCH_UP_WINDOW_DAYS,
}: {
  expenses: Expense[];
  reviewedDates?: string[];
  today?: Date;
  limit?: number;
}): CatchUpQueue {
  const todayKey = localDateInputValue(today);
  const recorded = new Set<string>();
  let lastRecordedDay: string | null = null;

  for (const expense of expenses) {
    const day = dayKey(expense.date);
    recorded.add(day);
    // A post-dated entry is not evidence of a day already handled, and letting
    // it become `lastRecordedDay` would collapse the window to nothing.
    if (day > todayKey) continue;
    if (lastRecordedDay === null || day > lastRecordedDay) lastRecordedDay = day;
  }

  // Someone who has never recorded anything is not behind on anything. Without
  // this, a fresh signup would be asked about days before they joined.
  if (lastRecordedDay === null) return { days: [], olderCount: 0, lastRecordedDay: null };

  const reviewed = new Set(reviewedDates);
  const missing: string[] = [];
  const cursor = parseFinancialDate(lastRecordedDay);
  cursor.setDate(cursor.getDate() + 1);

  // `parseFinancialDate` anchors at midday, so stepping a day at a time crosses
  // a daylight-saving boundary without landing on the wrong date.
  while (localDateInputValue(cursor) <= todayKey) {
    const day = localDateInputValue(cursor);
    if (!recorded.has(day) && !reviewed.has(day)) missing.push(day);
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days: missing.slice(0, limit),
    olderCount: Math.max(0, missing.length - limit),
    lastRecordedDay,
  };
}

/** The field names the day the card returns, so it is hidden strictly before it. */
export function isDismissed(dismissedUntil: string | undefined, today = new Date()): boolean {
  if (!dismissedUntil) return false;
  return localDateInputValue(today) < dismissedUntil;
}

/**
 * Reviewed dates worth keeping.
 *
 * This list is pushed on every sync. Unpruned it would grow by up to 365 strings
 * a year and be resent in full for the life of the account, to answer a question
 * nobody asks about a day months gone.
 */
export function pruneReviewedDates(
  dates: string[],
  today = new Date(),
  keepDays = REVIEWED_RETENTION_DAYS,
): string[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffKey = localDateInputValue(cutoff);

  return Array.from(new Set(dates.filter((date) => date >= cutoffKey))).sort();
}

/** "Today" for the current day, "Mon, 17 Aug" for any other. */
export function dayLabel(day: string, today = new Date()): string {
  if (day === localDateInputValue(today)) return "Today";
  return parseFinancialDate(day).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
