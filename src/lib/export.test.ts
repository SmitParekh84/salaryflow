import { describe, expect, it } from "vitest";
import { exportExpensesCsv } from "./export";
import type { Expense } from "./types";
import { dateInputToIso } from "./utils";

const expense = (date: string): Expense =>
  ({
    id: "e1",
    date,
    amount: 250,
    category: "Food",
    paymentMethod: "UPI",
  }) as Expense;

const dateColumn = (csv: string) => csv.split("\n")[1].split(",")[0].replaceAll('"', "");

describe("exportExpensesCsv", () => {
  it("exports a form-written date unchanged", () => {
    // Anchored at local noon, so this one is on the same day in UTC too.
    expect(dateColumn(exportExpensesCsv([expense(dateInputToIso("2026-09-30"))]))).toBe(
      "2026-09-30",
    );
  });

  it("keeps a date-only value on its own day", () => {
    expect(dateColumn(exportExpensesCsv([expense("2026-01-31")]))).toBe("2026-01-31");
  });

  /*
   * The two times that straddle midnight UTC. Whichever side of UTC the runner
   * sits on, one of these lands on a different UTC day than local day — which
   * is exactly what `toISOString().slice(0, 10)` used to report. Both must come
   * back as the local day the app displays.
   */
  it("reports an after-midnight timestamp as that day, not the UTC day", () => {
    const earlyMorning = new Date(2026, 5, 15, 2, 0).toISOString();
    expect(dateColumn(exportExpensesCsv([expense(earlyMorning)]))).toBe("2026-06-15");
  });

  it("reports a late-evening timestamp as that day, not the UTC day", () => {
    const lateEvening = new Date(2026, 5, 15, 23, 30).toISOString();
    expect(dateColumn(exportExpensesCsv([expense(lateEvening)]))).toBe("2026-06-15");
  });

  it("writes a header and one row per expense", () => {
    const csv = exportExpensesCsv([expense("2026-01-31"), expense("2026-02-01")]);
    expect(csv.split("\n")).toHaveLength(3);
  });
});
