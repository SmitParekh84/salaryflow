import { describe, expect, it } from "vitest";
import {
  dayKey,
  dayLabel,
  expensesOnDay,
  isDismissed,
  missingDays,
  pruneReviewedDates,
} from "./catch-up";
import type { Expense } from "./types";

/**
 * Built from local Y/M/D so the suite gives the same answer in every timezone.
 * Writing a literal "…T00:25:00.000Z" would pass in IST and fail in UTC-5.
 */
function localIso(year: number, month: number, day: number, hour = 9, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function expense(id: string, iso: string, amount = 100): Expense {
  return { id, amount, category: "Food", paymentMethod: "UPI", date: iso };
}

const AUG_20 = new Date(2026, 7, 20, 10, 0);

describe("dayKey", () => {
  it("files a timestamp under its local day", () => {
    expect(dayKey(localIso(2026, 8, 20, 0, 25))).toBe("2026-08-20");
    expect(dayKey(localIso(2026, 8, 20, 23, 55))).toBe("2026-08-20");
  });

  it("accepts a date-only value unchanged", () => {
    expect(dayKey("2026-08-20")).toBe("2026-08-20");
  });
});

describe("missingDays", () => {
  it("returns nothing when no expense was ever recorded", () => {
    expect(missingDays({ expenses: [], today: AUG_20 })).toEqual({
      days: [],
      olderCount: 0,
      lastRecordedDay: null,
    });
  });

  it("walks the gap oldest first and includes today", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16))],
      today: AUG_20,
    });

    expect(queue.lastRecordedDay).toBe("2026-08-16");
    expect(queue.days).toEqual(["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"]);
    expect(queue.olderCount).toBe(0);
  });

  it("leaves out a day that already has an expense", () => {
    const queue = missingDays({
      expenses: [
        expense("a", localIso(2026, 8, 16)),
        expense("b", localIso(2026, 8, 18)),
        expense("c", localIso(2026, 8, 20)),
      ],
      today: AUG_20,
    });

    // 17 and 19 are the only days without an expense, and 19 is the only one
    // after the most recent entry.
    expect(queue.lastRecordedDay).toBe("2026-08-20");
    expect(queue.days).toEqual([]);
  });

  /**
   * The window opens after the most recent entry, so a gap surrounded by
   * recorded days is never offered. That is the spec's rule and it is
   * deliberate: this feature answers "you have not recorded since the 16th",
   * not "you have holes in your history". Widening it would mean chasing every
   * historic gap forever.
   */
  it("does not chase a gap that sits between two recorded days", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16)), expense("b", localIso(2026, 8, 18))],
      today: AUG_20,
    });

    expect(queue.lastRecordedDay).toBe("2026-08-18");
    expect(queue.days).toEqual(["2026-08-19", "2026-08-20"]);
  });

  it("leaves out a day the user already called empty", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16))],
      reviewedDates: ["2026-08-17", "2026-08-19"],
      today: AUG_20,
    });

    expect(queue.days).toEqual(["2026-08-18", "2026-08-20"]);
  });

  it("caps a long absence and reports the remainder", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 7, 20))],
      today: AUG_20,
    });

    expect(queue.days).toHaveLength(7);
    expect(queue.days[0]).toBe("2026-07-21");
    expect(queue.olderCount).toBe(24); // 21 Jul – 20 Aug inclusive is 31 days
  });

  it("enumerates across a month boundary", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 7, 30))],
      today: new Date(2026, 7, 2, 10, 0),
    });

    expect(queue.days).toEqual(["2026-07-31", "2026-08-01", "2026-08-02"]);
  });

  it("does not let a post-dated expense collapse the window", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16)), expense("future", localIso(2026, 9, 30))],
      today: AUG_20,
    });

    expect(queue.lastRecordedDay).toBe("2026-08-16");
    expect(queue.days).toEqual(["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"]);
  });

  it("returns nothing when the last entry is today", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 20))],
      today: AUG_20,
    });

    expect(queue.days).toEqual([]);
  });

  it("files a late-night expense under its own day, not the one before", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 19, 0, 25))],
      today: AUG_20,
    });

    // The 19th is recorded, so only the 20th is outstanding.
    expect(queue.days).toEqual(["2026-08-20"]);
  });
});

describe("expensesOnDay", () => {
  it("matches on the local day", () => {
    const late = expense("a", localIso(2026, 8, 20, 0, 25));
    const other = expense("b", localIso(2026, 8, 21));

    expect(expensesOnDay([late, other], "2026-08-20").map((item) => item.id)).toEqual(["a"]);
  });
});

describe("isDismissed", () => {
  it("hides the card for the rest of the day it was dismissed on", () => {
    expect(isDismissed("2026-08-21", AUG_20)).toBe(true);
  });

  it("shows it again once that date arrives", () => {
    expect(isDismissed("2026-08-20", AUG_20)).toBe(false);
    expect(isDismissed("2026-08-19", AUG_20)).toBe(false);
  });

  it("is not dismissed when nothing was ever set", () => {
    expect(isDismissed(undefined, AUG_20)).toBe(false);
  });
});

describe("pruneReviewedDates", () => {
  it("drops entries older than the retention window and keeps the rest", () => {
    const kept = pruneReviewedDates(["2026-08-17", "2026-01-01"], AUG_20);
    expect(kept).toEqual(["2026-08-17"]);
  });

  it("removes duplicates and sorts", () => {
    expect(pruneReviewedDates(["2026-08-18", "2026-08-17", "2026-08-18"], AUG_20)).toEqual([
      "2026-08-17",
      "2026-08-18",
    ]);
  });
});

describe("dayLabel", () => {
  it("calls today Today rather than dating it", () => {
    expect(dayLabel("2026-08-20", AUG_20)).toBe("Today");
  });

  it("names the weekday for any other day", () => {
    expect(dayLabel("2026-08-17", AUG_20)).toContain("Aug");
  });
});
