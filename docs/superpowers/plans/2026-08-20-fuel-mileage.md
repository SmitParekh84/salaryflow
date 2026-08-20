# Fuel and Mileage Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record a fuel fill-up with an odometer reading and get a trustworthy running mileage (kmpl) and running cost (₹/km) on the dashboard and on Analytics, with a three-way filter.

**Architecture:** A fill-up is an existing `Expense` with category `Fuel` plus an optional `fuel` sub-object, so sync, tombstones, recycle bin and account-balance deduction are inherited unchanged. All arithmetic lives in one pure module, `src/lib/fuel.ts`, with no React and no network, so the calculation contract is unit-testable on its own. The rate lookup is a server route that never fails the request; the client falls back to the last rate it saw.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zustand (persisted), Mongoose, Zod 4, react-hook-form, Recharts, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-fuel-mileage-design.md`

## Global Constraints

- **Litres and rate are frozen into the record at save time.** Never re-derive litres from a current price at read time.
- **The rate route never returns a 5xx and never blocks a save.** Every failure path returns `{ configured: false }`.
- **Lifetime averages are totals-over-totals**, never the arithmetic mean of per-segment figures.
- **A segment's fuel is the litres of the LATER fill** of the pair (fill-to-fill convention).
- **Excluded segments leave numerator and denominator together.**
- Plausible range for the default vehicle (Activa 125): **35–65 kmpl**.
- Confidence labels: 0 included segments → no mileage; 1–3 → `provisional · N fill(s)`; 4+ → no qualifier.
- Dates use `parseFinancialDate` / `localDateInputValue` from `src/lib/utils.ts`. Never `new Date(isoString)` for day bucketing.
- Money is rendered with `formatMoney(amount, currency)` from `src/lib/utils.ts`.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm lint` before every commit.
- Never print a mileage figure derived from an empty or single-fill set without its confidence label.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` (modify) | `FuelFill`, `Vehicle`, `Expense.fuel`, `SalaryProfile.city` / `.vehicle` |
| `src/server/models.ts` (modify) | Mongoose sub-schemas so the new fields survive sync |
| `src/lib/fuel.ts` (create) | All fuel arithmetic. Pure, no React, no fetch |
| `src/lib/fuel.test.ts` (create) | Enforces the calculation contract |
| `src/app/api/fuel-price/route.ts` (create) | Server-side rate lookup, provider behind env config |
| `src/features/fuel/use-fuel-rate.ts` (create) | The three-step rate fallback chain |
| `src/features/fuel/fuel-card.tsx` (create) | Dashboard glance card |
| `src/features/fuel/fuel-report.tsx` (create) | Analytics stats, trend, fill list, filter |
| `src/features/fuel/vehicle-settings.tsx` (create) | City + vehicle editor |
| `src/features/analytics/charts.tsx` (modify) | `MileageTrendChart` |
| `src/features/analytics/lazy-charts.tsx` (modify) | Lazy export for it |
| `src/features/expenses/expense-form.tsx` (modify) | Fuel fields, shown only for the `Fuel` category |
| `src/features/dashboard/dashboard-view.tsx` (modify) | Mount `FuelCard` |
| `src/features/analytics/analytics-view.tsx` (modify) | Mount `FuelReport` |
| `src/features/settings/settings-view.tsx` (modify) | New `vehicle` section |
| `FINANCE-CALCULATIONS.md` (modify) | Fuel calculation contract |

---

### Task 1: Data model

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/server/models.ts:3-35` (ExpenseSchema), `src/server/models.ts:49-74` (SalaryProfileSchema)

**Interfaces:**
- Consumes: nothing.
- Produces: `FuelFill`, `Vehicle`, `Expense.fuel?: FuelFill`, `SalaryProfile.city?: string`, `SalaryProfile.vehicle?: Vehicle`. Every later task depends on these names.

- [ ] **Step 1: Add the types**

In `src/lib/types.ts`, directly after the `SharedExpenseDetails` interface:

```ts
export interface FuelFill {
  /**
   * Odometer reading in km at this fill. Optional: a user who did not read the
   * meter still gets their litres and rate recorded and the entry still counts
   * toward fuel spend. It simply takes no part in any distance figure.
   */
  odometerKm?: number;
  /** Frozen at save. Never re-derived from a later price. */
  litres: number;
  /** Frozen at save. Kept so an odd mileage can be traced back to its rate. */
  ratePerLitre: number;
  rateSource: "live" | "last-used" | "manual";
  /** User override of the plausibility flag. Undefined = automatic. */
  includeInAverage?: boolean;
}

export interface Vehicle {
  name: string;
  year?: number;
  /** Plausible mileage range. Segments outside it are flagged, not trusted. */
  minKmpl: number;
  maxKmpl: number;
}
```

Add `fuel?: FuelFill;` as the last field of `interface Expense`.

Add to `interface SalaryProfile`, after `customCategories`:

```ts
  city?: string;
  vehicle?: Vehicle;
```

- [ ] **Step 2: Add the Mongoose sub-schemas**

In `src/server/models.ts`, inside `ExpenseSchema`, directly after the `shared` field:

```ts
    fuel: {
      type: new Schema(
        {
          odometerKm: { type: Number, min: 0 },
          litres: { type: Number, required: true, min: 0 },
          ratePerLitre: { type: Number, required: true, min: 0 },
          rateSource: { type: String, default: "manual" },
          includeInAverage: { type: Boolean },
        },
        { _id: false },
      ),
      required: false,
    },
```

Inside `SalaryProfileSchema`, after `customCategories`:

```ts
    city: String,
    vehicle: {
      type: new Schema(
        {
          name: { type: String, required: true },
          year: Number,
          minKmpl: { type: Number, required: true, min: 1 },
          maxKmpl: { type: Number, required: true, min: 1 },
        },
        { _id: false },
      ),
      required: false,
    },
```

Both are optional, so existing documents stay valid and no migration runs. `src/app/api/sync/route.ts` passes `body.profile` through wholesale minus `RESERVED`, so `city` and `vehicle` sync with no route change.

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/server/models.ts
git commit -m "feat(fuel): carry odometer, litres and rate on a fuel expense"
```

---

### Task 2: Segment arithmetic

**Files:**
- Create: `src/lib/fuel.ts`
- Test: `src/lib/fuel.test.ts`

**Interfaces:**
- Consumes: `Expense`, `Vehicle` from Task 1.
- Produces:
  - `DEFAULT_VEHICLE: Vehicle`
  - `fuelPoints(expenses: Expense[]): FuelPoint[]`
  - `buildSegments(expenses: Expense[], vehicle: Vehicle): FuelSegment[]`
  - `previousOdometer(expenses: Expense[], isoDate: string, excludeId?: string): number | null`
  - types `FuelPoint`, `FuelSegment`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fuel.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_VEHICLE, buildSegments, previousOdometer } from "./fuel";
import type { Expense, FuelFill } from "./types";

function fill(
  id: string,
  date: string,
  amount: number,
  fuel?: Partial<FuelFill>,
): Expense {
  return {
    id,
    amount,
    category: "Fuel",
    paymentMethod: "UPI",
    date,
    ...(fuel
      ? {
          fuel: {
            litres: fuel.litres ?? amount / 105,
            ratePerLitre: fuel.ratePerLitre ?? 105,
            rateSource: fuel.rateSource ?? "manual",
            ...fuel,
          } as FuelFill,
        }
      : {}),
  };
}

/** The user's real records, which this feature was built from. */
const AUG_17 = fill("f1", "2026-08-17T22:00:00.000Z", 200, { odometerKm: 42166 });
const AUG_20 = fill("f2", "2026-08-20T00:25:00.000Z", 150, { odometerKm: 42242 });

describe("buildSegments", () => {
  it("gives a single fill no segment, rather than a mileage of zero", () => {
    expect(buildSegments([AUG_17], DEFAULT_VEHICLE)).toEqual([]);
  });

  it("measures a segment with the litres of the later fill", () => {
    const [segment] = buildSegments([AUG_17, AUG_20], DEFAULT_VEHICLE);

    expect(segment.distanceKm).toBe(76);
    // 150 / 105 = 1.4286 L over 76 km
    expect(segment.kmpl).toBeCloseTo(53.2, 1);
    expect(segment.costPerKm).toBeCloseTo(1.97, 2);
    expect(segment.id).toBe("f2");
    expect(segment.included).toBe(true);
  });

  it("sorts fills supplied out of order before segmenting", () => {
    const [segment] = buildSegments([AUG_20, AUG_17], DEFAULT_VEHICLE);
    expect(segment.distanceKm).toBe(76);
  });

  it("flags and excludes a segment left implausible by a forgotten fill", () => {
    const later = fill("f3", "2026-08-24T10:00:00.000Z", 220, {
      odometerKm: 42552,
      litres: 2.1,
    });
    const segments = buildSegments([AUG_17, AUG_20, later], DEFAULT_VEHICLE);
    const suspect = segments.find((segment) => segment.id === "f3")!;

    expect(suspect.kmpl).toBeGreaterThan(DEFAULT_VEHICLE.maxKmpl);
    expect(suspect.flagged).toBe(true);
    expect(suspect.included).toBe(false);
  });

  it("lets the user readmit a flagged segment", () => {
    const later = fill("f3", "2026-08-24T10:00:00.000Z", 220, {
      odometerKm: 42552,
      litres: 2.1,
      includeInAverage: true,
    });
    const suspect = buildSegments([AUG_17, AUG_20, later], DEFAULT_VEHICLE).find(
      (segment) => segment.id === "f3",
    )!;

    expect(suspect.flagged).toBe(true);
    expect(suspect.included).toBe(true);
  });

  it("lets the user drop an in-range segment", () => {
    const dropped = fill("f2b", "2026-08-20T00:25:00.000Z", 150, {
      odometerKm: 42242,
      includeInAverage: false,
    });
    const [segment] = buildSegments([AUG_17, dropped], DEFAULT_VEHICLE);

    expect(segment.flagged).toBe(false);
    expect(segment.included).toBe(false);
  });

  it("ignores fuel expenses with no odometer", () => {
    const noMeter = fill("f4", "2026-08-18T09:00:00.000Z", 300, { litres: 2.9 });
    expect(buildSegments([AUG_17, noMeter, AUG_20], DEFAULT_VEHICLE)).toHaveLength(1);
  });

  it("ignores expenses that are not fuel", () => {
    const lunch: Expense = {
      id: "e1",
      amount: 120,
      category: "Food",
      paymentMethod: "UPI",
      date: "2026-08-18T09:00:00.000Z",
    };
    expect(buildSegments([AUG_17, lunch, AUG_20], DEFAULT_VEHICLE)).toHaveLength(1);
  });

  it("produces no segment when the odometer did not move", () => {
    const same = fill("f5", "2026-08-21T09:00:00.000Z", 100, { odometerKm: 42242 });
    const segments = buildSegments([AUG_20, same], DEFAULT_VEHICLE);
    expect(segments).toEqual([]);
  });

  it("produces no segment for zero litres rather than Infinity", () => {
    const zero = fill("f6", "2026-08-22T09:00:00.000Z", 0, {
      odometerKm: 42400,
      litres: 0,
    });
    expect(buildSegments([AUG_20, zero], DEFAULT_VEHICLE)).toEqual([]);
  });
});

describe("previousOdometer", () => {
  it("returns the highest reading on or before the given date", () => {
    expect(previousOdometer([AUG_17, AUG_20], "2026-08-21T00:00:00.000Z")).toBe(42242);
  });

  it("ignores the record currently being edited", () => {
    expect(previousOdometer([AUG_17, AUG_20], "2026-08-21T00:00:00.000Z", "f2")).toBe(42166);
  });

  it("returns null when nothing precedes it", () => {
    expect(previousOdometer([AUG_20], "2026-08-01T00:00:00.000Z")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/fuel.test.ts`
Expected: FAIL — `Failed to resolve import "./fuel"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/fuel.ts`:

```ts
import type { Expense, Vehicle } from "./types";
import { parseFinancialDate } from "./utils";

/**
 * The vehicle a profile falls back to before the user has set one.
 *
 * The range is what an Activa 125 really returns, not the brochure figure.
 * It exists to catch a forgotten fill: an unlogged stop makes the next
 * segment's distance cover fuel that was never recorded, producing an inflated
 * and entirely believable mileage that would otherwise drag the lifetime
 * average up unnoticed.
 */
export const DEFAULT_VEHICLE: Vehicle = {
  name: "Activa 125",
  year: 2021,
  minKmpl: 35,
  maxKmpl: 65,
};

/** A fuel expense that carries an odometer reading. */
export interface FuelPoint {
  id: string;
  date: string;
  amount: number;
  odometerKm: number;
  litres: number;
  ratePerLitre: number;
  includeInAverage?: boolean;
}

export interface FuelSegment {
  /** The fill that ends this segment — the one whose litres measure it. */
  id: string;
  date: string;
  fromKm: number;
  toKm: number;
  distanceKm: number;
  litres: number;
  amount: number;
  kmpl: number;
  costPerKm: number;
  /** kmpl sits outside the vehicle's plausible range. */
  flagged: boolean;
  /** Final decision after any user override. */
  included: boolean;
}

export function isFuelExpense(expense: Expense): boolean {
  return expense.category === "Fuel";
}

/**
 * Fuel expenses with an odometer, ordered by distance travelled.
 *
 * Sorted by odometer rather than by date because the odometer is the thing the
 * arithmetic walks, and two fills on the same evening would otherwise be
 * segmented backwards.
 */
export function fuelPoints(expenses: Expense[]): FuelPoint[] {
  return expenses
    .filter((expense) => isFuelExpense(expense) && typeof expense.fuel?.odometerKm === "number")
    .map((expense) => ({
      id: expense.id,
      date: expense.date,
      amount: expense.amount,
      odometerKm: expense.fuel!.odometerKm!,
      litres: expense.fuel!.litres,
      ratePerLitre: expense.fuel!.ratePerLitre,
      includeInAverage: expense.fuel!.includeInAverage,
    }))
    .sort(
      (a, b) =>
        a.odometerKm - b.odometerKm ||
        parseFinancialDate(a.date).getTime() - parseFinancialDate(b.date).getTime(),
    );
}

/**
 * The stretches between consecutive fills.
 *
 * The litres added at a fill replace the fuel burned reaching it, so a segment
 * is measured by the litres of the LATER fill. This is exact when every fill is
 * to full; under partial top-ups it is approximate per segment, and the errors
 * — differences in tank level between the two stops — cancel as fills
 * accumulate. Attributing the earlier fill's litres would be wrong by the same
 * magnitude and would additionally lag by one segment.
 */
export function buildSegments(expenses: Expense[], vehicle: Vehicle): FuelSegment[] {
  const points = fuelPoints(expenses);
  const segments: FuelSegment[] = [];

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const distanceKm = current.odometerKm - previous.odometerKm;

    // A stationary odometer or a fill with no fuel in it measures nothing.
    // Guarded here as well as at input because records also arrive from sync,
    // from an older build on another device, and from recycle-bin restores.
    if (distanceKm <= 0 || current.litres <= 0) continue;

    const kmpl = distanceKm / current.litres;
    const flagged = kmpl < vehicle.minKmpl || kmpl > vehicle.maxKmpl;

    segments.push({
      id: current.id,
      date: current.date,
      fromKm: previous.odometerKm,
      toKm: current.odometerKm,
      distanceKm,
      litres: current.litres,
      amount: current.amount,
      kmpl,
      costPerKm: current.amount / distanceKm,
      flagged,
      included: current.includeInAverage ?? !flagged,
    });
  }

  return segments;
}

/**
 * The highest reading recorded on or before `isoDate`.
 *
 * Used by the form to reject an odometer that goes backwards. `excludeId` keeps
 * a record being edited from being compared against itself.
 */
export function previousOdometer(
  expenses: Expense[],
  isoDate: string,
  excludeId?: string,
): number | null {
  const cutoff = parseFinancialDate(isoDate).getTime();
  const readings = fuelPoints(expenses)
    .filter(
      (point) => point.id !== excludeId && parseFinancialDate(point.date).getTime() <= cutoff,
    )
    .map((point) => point.odometerKm);

  return readings.length > 0 ? Math.max(...readings) : null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/fuel.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fuel.ts src/lib/fuel.test.ts
git commit -m "feat(fuel): measure a segment by the litres of the later fill"
```

---

### Task 3: Lifetime averages, filter, and the calculation contract

**Files:**
- Modify: `src/lib/fuel.ts`
- Modify: `src/lib/fuel.test.ts`
- Modify: `FINANCE-CALCULATIONS.md`

**Interfaces:**
- Consumes: `buildSegments`, `FuelSegment`, `DEFAULT_VEHICLE` from Task 2.
- Produces:
  - `type FuelFilter = "all" | "with-km" | "without-km"`
  - `interface FuelSummary`
  - `fuelSummary(expenses: Expense[], vehicle: Vehicle, filter?: FuelFilter): FuelSummary`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/fuel.test.ts` (and extend the import to
`import { DEFAULT_VEHICLE, buildSegments, fuelSummary, previousOdometer } from "./fuel";`):

```ts
describe("fuelSummary", () => {
  it("reports no mileage from a single fill instead of a zero", () => {
    const summary = fuelSummary([AUG_17], DEFAULT_VEHICLE);

    expect(summary.kmpl).toBeNull();
    expect(summary.costPerKm).toBeNull();
    expect(summary.confidence).toBe("none");
    expect(summary.totalSpend).toBe(200);
  });

  it("reproduces the worked example", () => {
    const summary = fuelSummary([AUG_17, AUG_20], DEFAULT_VEHICLE);

    expect(summary.kmpl).toBeCloseTo(53.2, 1);
    expect(summary.costPerKm).toBeCloseTo(1.97, 2);
    expect(summary.totalDistanceKm).toBe(76);
    expect(summary.totalSpend).toBe(350);
    expect(summary.confidence).toBe("provisional");
  });

  it("weights by distance, not by segment count", () => {
    // A short thirsty hop and a long efficient run. The naive mean of the two
    // segment figures is 45; the correct distance-weighted figure is not.
    const start = fill("w0", "2026-07-01T09:00:00.000Z", 100, { odometerKm: 40000 });
    const short = fill("w1", "2026-07-02T09:00:00.000Z", 100, {
      odometerKm: 40020,
      litres: 0.5, // 20 km / 0.5 L = 40 kmpl
    });
    const long = fill("w2", "2026-07-20T09:00:00.000Z", 500, {
      odometerKm: 40520,
      litres: 10, // 500 km / 10 L = 50 kmpl
    });

    const summary = fuelSummary([start, short, long], DEFAULT_VEHICLE);
    const naiveMean = (40 + 50) / 2;

    // 520 km over 10.5 L
    expect(summary.kmpl).toBeCloseTo(520 / 10.5, 4);
    expect(summary.kmpl).not.toBeCloseTo(naiveMean, 1);
  });

  it("excludes a flagged segment from both sums", () => {
    const suspect = fill("f3", "2026-08-24T10:00:00.000Z", 220, {
      odometerKm: 42552,
      litres: 2.1,
    });
    const withSuspect = fuelSummary([AUG_17, AUG_20, suspect], DEFAULT_VEHICLE);
    const without = fuelSummary([AUG_17, AUG_20], DEFAULT_VEHICLE);

    expect(withSuspect.kmpl).toBeCloseTo(without.kmpl!, 6);
    expect(withSuspect.totalDistanceKm).toBe(without.totalDistanceKm);
    // The spend still counts — the money was really spent.
    expect(withSuspect.totalSpend).toBe(570);
  });

  it("settles out of provisional at four included segments", () => {
    const fills = [fill("s0", "2026-06-01T09:00:00.000Z", 200, { odometerKm: 40000 })];
    for (let index = 1; index <= 4; index++) {
      fills.push(
        fill(`s${index}`, `2026-06-0${index + 1}T09:00:00.000Z`, 200, {
          odometerKm: 40000 + index * 100,
          litres: 2, // 100 km / 2 L = 50 kmpl, comfortably in range
        }),
      );
    }

    expect(fuelSummary(fills.slice(0, 4), DEFAULT_VEHICLE).confidence).toBe("provisional");
    expect(fuelSummary(fills, DEFAULT_VEHICLE).confidence).toBe("settled");
  });

  it("counts spending-only fuel entries in spend but not in distance", () => {
    const noMeter = fill("f4", "2026-08-18T09:00:00.000Z", 300, { litres: 2.9 });
    const summary = fuelSummary([AUG_17, noMeter, AUG_20], DEFAULT_VEHICLE);

    expect(summary.totalSpend).toBe(650);
    expect(summary.totalDistanceKm).toBe(76);
  });

  it("leaves non-fuel expenses out entirely", () => {
    const lunch: Expense = {
      id: "e1",
      amount: 120,
      category: "Food",
      paymentMethod: "UPI",
      date: "2026-08-18T09:00:00.000Z",
    };
    expect(fuelSummary([AUG_17, AUG_20, lunch], DEFAULT_VEHICLE).totalSpend).toBe(350);
  });

  describe("filter", () => {
    const noMeter = fill("f4", "2026-08-18T09:00:00.000Z", 300, { litres: 2.9 });
    const all = [AUG_17, noMeter, AUG_20];

    it("'with-km' keeps only fills that have a reading", () => {
      const summary = fuelSummary(all, DEFAULT_VEHICLE, "with-km");

      expect(summary.fills.map((expense) => expense.id)).toEqual(["f2", "f1"]);
      expect(summary.totalSpend).toBe(350);
      expect(summary.kmpl).toBeCloseTo(53.2, 1);
    });

    it("'without-km' shows spend and refuses to invent a mileage", () => {
      const summary = fuelSummary(all, DEFAULT_VEHICLE, "without-km");

      expect(summary.fills.map((expense) => expense.id)).toEqual(["f4"]);
      expect(summary.totalSpend).toBe(300);
      expect(summary.kmpl).toBeNull();
      expect(summary.costPerKm).toBeNull();
    });

    it("'all' lists everything, newest first", () => {
      const summary = fuelSummary(all, DEFAULT_VEHICLE, "all");
      expect(summary.fills.map((expense) => expense.id)).toEqual(["f2", "f4", "f1"]);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/fuel.test.ts`
Expected: FAIL — `fuelSummary is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/fuel.ts`, and extend the `utils` import to
`import { newestFirst, parseFinancialDate } from "./utils";`:

```ts
export type FuelFilter = "all" | "with-km" | "without-km";

export interface FuelSummary {
  /** Null rather than zero when there is nothing to measure. */
  kmpl: number | null;
  costPerKm: number | null;
  totalDistanceKm: number;
  totalLitres: number;
  /** Every fuel expense under the active filter, measured or not. */
  totalSpend: number;
  includedSegments: number;
  confidence: "none" | "provisional" | "settled";
  segments: FuelSegment[];
  /** Fills under the active filter, newest first. */
  fills: Expense[];
}

function hasOdometer(expense: Expense): boolean {
  return typeof expense.fuel?.odometerKm === "number";
}

function total<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((running, item) => running + pick(item), 0);
}

/**
 * Everything the card and the report display.
 *
 * The lifetime figures are totals over totals, never the mean of the segment
 * figures: a 20 km hop must not weigh the same as a 300 km run. Excluding a
 * segment removes its distance from the numerator and its litres from the
 * denominator together, so dropping a bad row never distorts the rest.
 */
export function fuelSummary(
  expenses: Expense[],
  vehicle: Vehicle,
  filter: FuelFilter = "all",
): FuelSummary {
  const fuelExpenses = expenses.filter(isFuelExpense);
  const fills = newestFirst(
    fuelExpenses.filter((expense) => {
      if (filter === "with-km") return hasOdometer(expense);
      if (filter === "without-km") return !hasOdometer(expense);
      return true;
    }),
  );

  // The "without-km" view contains no readings by definition, so it reports
  // spend and says so, rather than printing a figure from an empty set.
  const segments = filter === "without-km" ? [] : buildSegments(fills, vehicle);
  const included = segments.filter((segment) => segment.included);

  const totalDistanceKm = total(included, (segment) => segment.distanceKm);
  const totalLitres = total(included, (segment) => segment.litres);
  const measuredSpend = total(included, (segment) => segment.amount);

  return {
    kmpl: totalLitres > 0 ? totalDistanceKm / totalLitres : null,
    costPerKm: totalDistanceKm > 0 ? measuredSpend / totalDistanceKm : null,
    totalDistanceKm,
    totalLitres,
    totalSpend: total(fills, (expense) => expense.amount),
    includedSegments: included.length,
    confidence:
      included.length === 0 ? "none" : included.length < 4 ? "provisional" : "settled",
    segments,
    fills,
  };
}

/** "provisional · 2 fills" while a partial-fill average is still settling. */
export function confidenceLabel(summary: FuelSummary): string | null {
  if (summary.confidence !== "provisional") return null;
  const count = summary.includedSegments;
  return `provisional · ${count} fill${count === 1 ? "" : "s"}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/fuel.test.ts`
Expected: PASS, 22 tests.

- [ ] **Step 5: Record the contract**

Append to `FINANCE-CALCULATIONS.md`, after the existing sections:

```markdown
## Fuel and Mileage

A fill-up is an expense with category `Fuel` carrying `fuel.odometerKm`,
`fuel.litres` and `fuel.ratePerLitre`. Litres and rate are frozen at save time
and never re-derived from a current price, so a past month's mileage cannot
change when pump prices move.

Fills are ordered by odometer. A segment runs between consecutive fills and is
measured by the litres of the **later** fill, because the fuel added at a stop
replaces what was burned reaching it.

```text
distance_i = odo_(i+1) − odo_i
mileage_i  = distance_i / L_(i+1)
cost_i     = A_(i+1) / distance_i
```

Lifetime figures are totals over totals, not the mean of the segment figures:

```text
overall kmpl = Σ distance_i / Σ L_(i+1)
overall ₹/km = Σ A_(i+1)   / Σ distance_i
```

Both sums run over included segments only. A segment whose mileage falls
outside the vehicle's plausible range (35–65 kmpl for the Activa 125) is
flagged and excluded — the dominant cause is a fill the user forgot to record,
which inflates the next segment believably. `fuel.includeInAverage` overrides
the flag in either direction.

The first fill has no predecessor and yields no segment. A segment is skipped
when the odometer did not advance or the fill held no litres. Fewer than two
readings, or the "without km" filter, produce a null mileage that the UI renders
as `—`, never as a number.

Add to `src/lib/fuel.test.ts` when these rules change.
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all pass.

```bash
git add src/lib/fuel.ts src/lib/fuel.test.ts FINANCE-CALCULATIONS.md
git commit -m "feat(fuel): average by total distance over total litres"
```

---

### Task 4: Rate lookup

**Files:**
- Create: `src/app/api/fuel-price/route.ts`
- Create: `src/features/fuel/use-fuel-rate.ts`

**Interfaces:**
- Consumes: `getAuthenticatedContext` from `src/lib/api-security.ts`, `consumeRateLimit` from `src/lib/rate-limit.ts`, `useFinanceStore` from `src/lib/store.ts`.
- Produces:
  - `GET /api/fuel-price?city=…` → `{ configured: false }` or `{ configured: true, rate, city, date }`
  - `lastUsedRate(expenses: Expense[]): number | null`
  - `useFuelRate(enabled: boolean): { rate: number | null; source: "live" | "last-used" | "manual"; markManual: () => void }`

- [ ] **Step 1: Write the route**

Create `src/app/api/fuel-price/route.ts`:

```ts
import { getAuthenticatedContext } from "@/lib/api-security";
import { consumeRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Today's petrol rate, when a provider is configured.
 *
 * This route never fails the request. A rate lookup is a convenience on top of
 * a field the user can always type, and a fill has to stay recordable while
 * standing at a pump with no signal — so every failure path answers
 * `configured: false` and the client falls back to the last rate it saw. An
 * error status here would surface as a scary toast over a form that was about
 * to work perfectly well.
 */
export async function GET(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await consumeRateLimit({
    scope: "fuel-price",
    identifier: context.userId,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) return NextResponse.json({ configured: false });

  const apiKey = process.env.FUEL_PRICE_API_KEY;
  const city = new URL(request.url).searchParams.get("city")?.trim();
  if (!apiKey || !city) return NextResponse.json({ configured: false });

  try {
    const rate = await fetchProviderRate(city, apiKey);
    return NextResponse.json({
      configured: true,
      rate,
      city,
      date: new Date().toISOString().slice(0, 10),
    });
  } catch {
    return NextResponse.json({ configured: false });
  }
}

/**
 * The provider, expressed as configuration rather than code.
 *
 * No official free government API publishes daily city-wise Indian retail
 * prices, so this has to work against whichever third-party vendor the operator
 * signs up with. `FUEL_PRICE_API_URL` carries a `{city}` placeholder and the
 * response is searched for a petrol figure, because every vendor nests it
 * somewhere slightly different. Swapping vendors is then an env change.
 */
async function fetchProviderRate(city: string, apiKey: string): Promise<number> {
  const template = process.env.FUEL_PRICE_API_URL;
  if (!template) throw new Error("FUEL_PRICE_API_URL is not set");

  const response = await fetch(template.replace("{city}", encodeURIComponent(city)), {
    headers: { Authorization: `Bearer ${apiKey}`, "X-Api-Key": apiKey },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`provider responded ${response.status}`);

  const rate = findPetrolRate(await response.json());
  if (rate === null) throw new Error("no petrol rate in provider response");
  return rate;
}

function findPetrolRate(value: unknown, depth = 0): number | null {
  if (depth > 4 || value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const key of ["petrol", "Petrol", "petrol_price", "petrolPrice"]) {
    const candidate = Number(record[key]);
    if (Number.isFinite(candidate) && candidate > 0) return candidate;
  }
  for (const nested of Object.values(record)) {
    const found = findPetrolRate(nested, depth + 1);
    if (found !== null) return found;
  }
  return null;
}
```

- [ ] **Step 2: Write the hook**

Create `src/features/fuel/use-fuel-rate.ts`:

```ts
"use client";

import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { parseFinancialDate } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

export type RateSource = "live" | "last-used" | "manual";

/** The rate from the most recent fill that recorded one. */
export function lastUsedRate(expenses: Expense[]): number | null {
  const rate = expenses
    .filter((expense) => expense.category === "Fuel" && expense.fuel)
    .sort(
      (a, b) =>
        parseFinancialDate(b.date).getTime() - parseFinancialDate(a.date).getTime(),
    )[0]?.fuel?.ratePerLitre;

  return typeof rate === "number" && rate > 0 ? rate : null;
}

/**
 * The rate to prefill, and where it came from.
 *
 * Falls through: live lookup, then the last rate the user actually paid, then
 * nothing and they type it. The last-used value is set first and synchronously,
 * so the field is never briefly empty while a request is in flight.
 *
 * Reads expenses through `getState()` rather than a selector on purpose —
 * subscribing would re-run the effect and re-issue the request on every
 * unrelated expense change while the form sits open.
 */
export function useFuelRate(enabled: boolean) {
  const city = useFinanceStore((state) => state.profile.city);
  const [rate, setRate] = useState<number | null>(null);
  const [source, setSource] = useState<RateSource>("last-used");

  useEffect(() => {
    if (!enabled) return;

    setRate(lastUsedRate(useFinanceStore.getState().expenses));
    setSource("last-used");
    if (!city) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/fuel-price?city=${encodeURIComponent(city)}`, {
          credentials: "include",
        });
        if (!response.ok) return;

        const json = await response.json();
        if (cancelled || json?.configured !== true) return;
        setRate(json.rate);
        setSource("live");
      } catch {
        // Offline at a pump is the expected case here, not an error to report.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, city]);

  const markManual = useCallback(() => setSource("manual"), []);
  return { rate, source, markManual };
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/fuel-price src/features/fuel/use-fuel-rate.ts
git commit -m "feat(fuel): look up today's rate, and never let it block a save"
```

---

### Task 5: Fuel fields on the expense form

**Files:**
- Modify: `src/features/expenses/expense-form.tsx`

**Interfaces:**
- Consumes: `previousOdometer` (Task 2), `useFuelRate` (Task 4), `optionalNumber` from `src/lib/schemas/primitives.ts`.
- Produces: expenses whose `fuel` field the later UI tasks read.

- [ ] **Step 1: Extend the form schema**

Add to the imports:

```ts
import { previousOdometer } from "@/lib/fuel";
import { optionalNumber } from "@/lib/schemas/primitives";
import { useFuelRate } from "@/features/fuel/use-fuel-rate";
```

Add to the `z.object({…})` fields:

```ts
    odometerKm: optionalNumber({ label: "odometer reading", min: 0, integer: true }),
    ratePerLitre: optionalNumber({ label: "rate per litre", min: 1 }),
```

`optionalNumber` is used rather than `z.coerce.number().optional()` because
coercion turns a cleared field into `0`, which would silently record a fill at
zero rupees a litre.

Add to the existing `.superRefine((values, context) => {…})`, before the shared-expense checks:

```ts
    // Litres are derived from the rate, so a reading with no rate cannot be
    // measured. Without a reading the entry is spending only, and needs neither.
    if (values.category === "Fuel" && values.odometerKm != null && !values.ratePerLitre) {
      context.addIssue({
        code: "custom",
        path: ["ratePerLitre"],
        message: "Enter the rate per litre so mileage can be worked out",
      });
    }
```

- [ ] **Step 2: Wire the rate prefill**

After the existing `useWatch` calls:

```ts
  const category = useWatch({ control, name: "category" });
  const isFuel = category === "Fuel";
  const { rate: suggestedRate, source: rateSource, markManual } = useFuelRate(open && isFuel);

  // Prefill only an untouched field: overwriting a rate the user has just typed
  // because a lookup landed a moment later would be maddening.
  useEffect(() => {
    if (!isFuel || suggestedRate === null) return;
    const current = getValues("ratePerLitre");
    if (current === undefined || current === "") setValue("ratePerLitre", suggestedRate);
  }, [isFuel, suggestedRate, getValues, setValue]);
```

Add `getValues` and `setValue` to the destructured `useForm` result.

Add to both branches of the `reset()` call in the existing `useEffect`:

```ts
              odometerKm: editing?.fuel?.odometerKm,
              ratePerLitre: editing?.fuel?.ratePerLitre,
```

(In the non-editing branch both are `undefined`.)

- [ ] **Step 3: Build the payload and reject a backwards odometer**

In `onSubmit`, before `const payload = {…}`:

```ts
    const litres =
      parsed.ratePerLitre && parsed.ratePerLitre > 0
        ? parsed.amount / parsed.ratePerLitre
        : null;
    const fuel =
      parsed.category === "Fuel" && litres !== null
        ? {
            odometerKm: parsed.odometerKm,
            litres,
            ratePerLitre: parsed.ratePerLitre!,
            rateSource,
            includeInAverage: editing?.fuel?.includeInAverage,
          }
        : undefined;

    // An odometer that goes backwards would produce a negative distance and a
    // segment that silently vanishes, so it is refused at the point of entry.
    if (fuel?.odometerKm != null) {
      const previous = previousOdometer(expenses, dateInputToIso(parsed.date), editing?.id);
      if (previous !== null && fuel.odometerKm <= previous) {
        setError("odometerKm", {
          message: `Must be higher than the last reading of ${previous} km`,
        });
        return;
      }
    }
```

Add `fuel,` to the `payload` object. A category changed away from `Fuel`
yields `undefined` here, which drops the sub-object from the record.

- [ ] **Step 4: Add the fields**

Directly before the `{isSharedForm && (…)}` block:

```tsx
        {isFuel && (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Fill-up details</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expense-odometer">Odometer (km)</Label>
                <Input
                  id="expense-odometer"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="42242"
                  {...register("odometerKm")}
                />
                {errors.odometerKm && (
                  <p className="mt-1 text-xs text-danger">{errors.odometerKm.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="expense-rate">Rate per litre</Label>
                <Input
                  id="expense-rate"
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  {...register("ratePerLitre", { onChange: markManual })}
                />
                {errors.ratePerLitre && (
                  <p className="mt-1 text-xs text-danger">{errors.ratePerLitre.message}</p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              {rateSource === "live"
                ? "Rate fetched for today. Change it if the pump differs."
                : "Rate carried over from your last fill. Change it if the price moved."}{" "}
              Odometer is optional — without it this records the spend only.
            </p>
          </div>
        )}
```

- [ ] **Step 5: Verify by hand**

Run: `pnpm dev`, open the expense form, choose `Fuel`.
Expected: the fill-up block appears; choosing another category hides it; saving
₹150 with odometer 42242 and rate 105 stores `fuel.litres ≈ 1.4286`; entering an
odometer lower than a previous fill shows the field error and blocks the save.

- [ ] **Step 6: Commit**

```bash
git add src/features/expenses/expense-form.tsx
git commit -m "feat(fuel): record the odometer and rate on a fuel expense"
```

---

### Task 6: City and vehicle settings

**Files:**
- Create: `src/features/fuel/vehicle-settings.tsx`
- Modify: `src/features/settings/settings-view.tsx:53-59` (the `SettingsSection` union and `SETTINGS_SECTIONS`)

**Interfaces:**
- Consumes: `DEFAULT_VEHICLE` (Task 2), `updateProfile` from the store.
- Produces: `VehicleSettings` component; `profile.city` and `profile.vehicle` become user-editable.

- [ ] **Step 1: Build the component**

Create `src/features/fuel/vehicle-settings.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { DEFAULT_VEHICLE } from "@/lib/fuel";
import { useFinanceStore } from "@/lib/store";
import { useState } from "react";

/**
 * The vehicle exists so mileage can be sanity-checked, and the city so a rate
 * can be looked up. Both are optional: without them fills still record, they
 * just lose the plausibility check and the rate prefill.
 */
export function VehicleSettings() {
  const profile = useFinanceStore((state) => state.profile);
  const updateProfile = useFinanceStore((state) => state.updateProfile);
  const syncWithServer = useFinanceStore((state) => state.syncWithServer);
  const vehicle = profile.vehicle ?? DEFAULT_VEHICLE;

  const [draft, setDraft] = useState({
    city: profile.city ?? "",
    name: vehicle.name,
    year: vehicle.year ? String(vehicle.year) : "",
    minKmpl: String(vehicle.minKmpl),
    maxKmpl: String(vehicle.maxKmpl),
  });
  const [saved, setSaved] = useState(false);

  const minKmpl = Number(draft.minKmpl);
  const maxKmpl = Number(draft.maxKmpl);
  const rangeIsValid = minKmpl > 0 && maxKmpl > minKmpl;

  const save = async () => {
    if (!rangeIsValid) return;
    updateProfile({
      city: draft.city.trim() || undefined,
      vehicle: {
        name: draft.name.trim() || DEFAULT_VEHICLE.name,
        year: draft.year ? Number(draft.year) : undefined,
        minKmpl,
        maxKmpl,
      },
    });
    setSaved(true);
    await syncWithServer();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fuel-city">City</Label>
        <Input
          id="fuel-city"
          placeholder="e.g. Surat"
          value={draft.city}
          onChange={(event) => setDraft({ ...draft, city: event.target.value })}
        />
        <p className="mt-1 text-xs text-muted">
          Petrol prices differ by several rupees a litre between states, so the
          rate lookup needs to know where you fill up.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vehicle-name">Vehicle</Label>
          <Input
            id="vehicle-name"
            placeholder="Activa 125"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="vehicle-year">Year</Label>
          <Input
            id="vehicle-year"
            type="number"
            inputMode="numeric"
            placeholder="2021"
            value={draft.year}
            onChange={(event) => setDraft({ ...draft, year: event.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vehicle-min">Lowest believable kmpl</Label>
          <Input
            id="vehicle-min"
            type="number"
            inputMode="decimal"
            value={draft.minKmpl}
            onChange={(event) => setDraft({ ...draft, minKmpl: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="vehicle-max">Highest believable kmpl</Label>
          <Input
            id="vehicle-max"
            type="number"
            inputMode="decimal"
            value={draft.maxKmpl}
            onChange={(event) => setDraft({ ...draft, maxKmpl: event.target.value })}
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        A fill-up whose mileage lands outside this range is set aside instead of
        counted — nearly always because a fill went unrecorded. You can still
        count it by hand from the fuel report.
      </p>
      {!rangeIsValid && (
        <p className="text-xs text-danger">
          The highest figure must be above the lowest, and both above zero.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={!rangeIsValid}>
          Save
        </Button>
        {saved && <span className="text-xs text-muted">Saved</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register the section**

In `src/features/settings/settings-view.tsx`, add `| "vehicle"` to the
`SettingsSection` union, add an entry to `SETTINGS_SECTIONS`:

```ts
  {
    id: "vehicle",
    label: "Vehicle & fuel",
    description: "Your vehicle, and the city your fuel rate comes from",
    icon: Fuel,
  },
```

Import `Fuel` from `lucide-react`, and render `<VehicleSettings />` inside a
`SettingsPane` for `section === "vehicle"`, following the pattern the
neighbouring sections already use.

- [ ] **Step 3: Verify by hand**

Run: `pnpm dev`, open Settings → Vehicle & fuel.
Expected: saving a city and a vehicle persists across a reload; a max below the
min disables the Save button.

- [ ] **Step 4: Commit**

```bash
git add src/features/fuel/vehicle-settings.tsx src/features/settings/settings-view.tsx
git commit -m "feat(fuel): let the user set their city and vehicle"
```

---

### Task 7: Dashboard card

**Files:**
- Create: `src/features/fuel/fuel-card.tsx`
- Modify: `src/features/dashboard/dashboard-view.tsx`

**Interfaces:**
- Consumes: `fuelSummary`, `confidenceLabel`, `DEFAULT_VEHICLE` (Tasks 2–3).
- Produces: `FuelCard` component.

- [ ] **Step 1: Build the card**

Create `src/features/fuel/fuel-card.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_VEHICLE, confidenceLabel, fuelSummary } from "@/lib/fuel";
import { useFinanceStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";
import { Fuel } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function FuelCard() {
  const expenses = useFinanceStore((state) => state.expenses);
  const currency = useFinanceStore((state) => state.profile.currency);
  const vehicle = useFinanceStore((state) => state.profile.vehicle) ?? DEFAULT_VEHICLE;

  const summary = useMemo(() => fuelSummary(expenses, vehicle), [expenses, vehicle]);

  // A user who never buys fuel should not carry a dead card on their dashboard.
  if (summary.fills.length === 0) return null;

  const latest = summary.fills[0];
  const provisional = confidenceLabel(summary);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Fuel className="h-4 w-4 text-muted" />
          {vehicle.name}
          {vehicle.year && <span className="text-muted">· {vehicle.year}</span>}
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-2xl font-bold tracking-tight">
            {summary.kmpl === null ? "—" : `${summary.kmpl.toFixed(1)} kmpl`}
          </p>
          <p className="text-sm text-muted">
            {summary.costPerKm === null
              ? "—"
              : `${formatMoney(summary.costPerKm, currency)} / km`}
          </p>
        </div>

        {/* Saying how green the number is beats printing it bare: one partial
            top-up is not yet evidence of anything. */}
        <p className="mt-1 text-[11px] text-muted">
          {provisional ??
            (summary.kmpl === null
              ? "Add an odometer reading at your next fill to see mileage"
              : `${Math.round(summary.totalDistanceKm)} km measured`)}
        </p>

        <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Last fill {formatDate(latest.date)} · {formatMoney(latest.amount, currency)}
          {latest.fuel?.odometerKm != null && ` · ${latest.fuel.odometerKm} km`}
        </div>

        <Link href="/analytics" className="mt-3 inline-block text-xs font-medium text-primary">
          Fuel report →
        </Link>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Mount it**

In `src/features/dashboard/dashboard-view.tsx`, import `FuelCard` from
`@/features/fuel/fuel-card` and render `<FuelCard />` in the grid alongside the
existing goal and bill cards. It returns `null` on its own when there is no
fuel data, so it needs no conditional at the call site.

- [ ] **Step 3: Verify by hand**

Run: `pnpm dev`, record the two example fills.
Expected: card shows `53.2 kmpl`, `₹1.97 / km`, and `provisional · 1 fill`.

- [ ] **Step 4: Commit**

```bash
git add src/features/fuel/fuel-card.tsx src/features/dashboard/dashboard-view.tsx
git commit -m "feat(fuel): show mileage and cost per km on the dashboard"
```

---

### Task 8: Analytics report

**Files:**
- Create: `src/features/fuel/fuel-report.tsx`
- Modify: `src/features/analytics/charts.tsx`, `src/features/analytics/lazy-charts.tsx`
- Modify: `src/features/analytics/analytics-view.tsx`

**Interfaces:**
- Consumes: `fuelSummary`, `confidenceLabel`, `FuelFilter`, `FuelSegment` (Tasks 2–3).
- Produces: `MileageTrendChart`, `FuelReport`.

- [ ] **Step 1: Add the chart**

In `src/features/analytics/charts.tsx`, following the shape of the existing
`SpendTrendChart`:

```tsx
export function MileageTrendChart({ segments }: { segments: FuelSegment[] }) {
  const data = useMemo(
    () =>
      segments
        .filter((segment) => segment.included)
        .map((segment) => ({
          label: new Date(segment.date).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          }),
          kmpl: Number(segment.kmpl.toFixed(1)),
        })),
    [segments],
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value: number) => [`${value} kmpl`, "Mileage"]} />
        <Line
          type="monotone"
          dataKey="kmpl"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

Add `LineChart`, `Line`, `YAxis` to the existing `recharts` import if absent,
and `import type { FuelSegment } from "@/lib/fuel";`.

In `src/features/analytics/lazy-charts.tsx`:

```tsx
export const MileageTrendChart = dynamic(
  () => import("./charts").then((m) => m.MileageTrendChart),
  { ssr: false, loading: () => <ChartFallback height={200} /> },
);
```

- [ ] **Step 2: Build the report**

Create `src/features/fuel/fuel-report.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MileageTrendChart } from "@/features/analytics/lazy-charts";
import {
  DEFAULT_VEHICLE,
  type FuelFilter,
  confidenceLabel,
  fuelSummary,
} from "@/lib/fuel";
import { useFinanceStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";
import { useMemo, useState } from "react";

const FILTERS: { id: FuelFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "with-km", label: "With km" },
  { id: "without-km", label: "Without km" },
];

export function FuelReport() {
  const expenses = useFinanceStore((state) => state.expenses);
  const currency = useFinanceStore((state) => state.profile.currency);
  const vehicle = useFinanceStore((state) => state.profile.vehicle) ?? DEFAULT_VEHICLE;
  const updateExpense = useFinanceStore((state) => state.updateExpense);
  const [filter, setFilter] = useState<FuelFilter>("all");

  const summary = useMemo(
    () => fuelSummary(expenses, vehicle, filter),
    [expenses, vehicle, filter],
  );
  const segmentById = useMemo(
    () => new Map(summary.segments.map((segment) => [segment.id, segment])),
    [summary.segments],
  );

  if (expenses.some((expense) => expense.category === "Fuel") === false) return null;

  const countFlagged = (id: string, included: boolean) => {
    const existing = expenses.find((expense) => expense.id === id);
    if (!existing?.fuel) return;
    updateExpense(id, { fuel: { ...existing.fuel, includeInAverage: included } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Fuel · {vehicle.name}</CardTitle>
        <div className="flex gap-1">
          {FILTERS.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={filter === option.id ? "default" : "ghost"}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure
            label="Mileage"
            value={summary.kmpl === null ? "—" : `${summary.kmpl.toFixed(1)} kmpl`}
            hint={
              confidenceLabel(summary) ??
              (summary.kmpl === null ? "needs two readings" : undefined)
            }
          />
          <Figure
            label="Cost"
            value={
              summary.costPerKm === null
                ? "—"
                : `${formatMoney(summary.costPerKm, currency)}/km`
            }
          />
          <Figure label="Spent" value={formatMoney(summary.totalSpend, currency)} />
          <Figure label="Measured" value={`${Math.round(summary.totalDistanceKm)} km`} />
        </div>

        {/* The filter that shows only unmeasured fills must not quietly show a
            mileage carried over from the other view. */}
        {filter === "without-km" && (
          <p className="text-xs text-muted">
            These fills have no odometer reading, so they can only be counted as
            spending. Add a reading at the pump to measure them.
          </p>
        )}

        {summary.segments.some((segment) => segment.included) && (
          <MileageTrendChart segments={summary.segments} />
        )}

        <div className="divide-y divide-border">
          {summary.fills.map((expense) => {
            const segment = segmentById.get(expense.id);
            return (
              <div key={expense.id} className="flex flex-wrap items-baseline gap-x-4 py-2 text-sm">
                <span className="w-20 shrink-0 text-muted">{formatDate(expense.date)}</span>
                <span className="w-20 shrink-0">{formatMoney(expense.amount, currency)}</span>
                <span className="w-24 shrink-0 text-muted">
                  {expense.fuel?.odometerKm != null ? `${expense.fuel.odometerKm} km` : "no reading"}
                </span>
                <span className="w-20 shrink-0 text-muted">
                  {segment ? `${segment.distanceKm} km` : "—"}
                </span>
                <span className="w-24 shrink-0 font-medium">
                  {segment ? `${segment.kmpl.toFixed(1)} kmpl` : "start"}
                </span>
                {segment?.flagged && (
                  <span className="flex items-center gap-2 text-xs text-warning">
                    looks off — missed a fill?
                    <button
                      type="button"
                      className="underline"
                      onClick={() => countFlagged(expense.id, !segment.included)}
                    >
                      {segment.included ? "set aside" : "count it anyway"}
                    </button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Mount it**

In `src/features/analytics/analytics-view.tsx`, import `FuelReport` from
`@/features/fuel/fuel-report` and render `<FuelReport />` after the final chart
grid. It returns `null` when there is no fuel data.

- [ ] **Step 4: Verify the whole feature**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all pass.

Run: `pnpm dev` and check on Analytics:
- `All` lists every fuel expense; `With km` narrows to fills with readings;
  `Without km` shows the rest with `—` for mileage and the explanation.
- A fill flagged as implausible shows the warning and toggles in and out of the
  average, and the headline figure changes when it does.

- [ ] **Step 5: Commit**

```bash
git add src/features/fuel/fuel-report.tsx src/features/analytics
git commit -m "feat(fuel): report mileage, cost and fills with a km filter"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| Freeze the price into the record | 1 (fields), 5 (payload) |
| Segment definition, later-fill convention | 2 |
| Lifetime averages as totals over totals | 3 |
| Plausibility flagging and override | 2 (compute), 8 (UI toggle) |
| Confidence labels | 3 (`confidenceLabel`), 7, 8 |
| Guards table | 2 (segments), 5 (input) |
| Worked example | 2, 3 (tests) |
| Rate lookup, never fails | 4 |
| Data model, Mongoose | 1 |
| Filtering | 3 (logic), 8 (UI) |
| Dashboard card | 7 |
| Analytics report | 8 |
| Expense form | 5 |
| Error handling table | 5 (odometer, rate), 4 (route), 1 (`fuel` dropped on category change) |
| Testing list | 2, 3 |
| `FINANCE-CALCULATIONS.md` | 3 |

No gaps.

**Type consistency**

`FuelFill`, `Vehicle`, `FuelPoint`, `FuelSegment`, `FuelSummary`, `FuelFilter`
are defined in Tasks 1–3 and used under those exact names in 5, 7 and 8.
`fuelSummary(expenses, vehicle, filter)` keeps the same argument order at all
three call sites. `confidenceLabel(summary)` takes the summary, not a count, in
both consumers. `previousOdometer(expenses, isoDate, excludeId)` matches its
single caller in Task 5.

**Deferred, per the spec:** multiple vehicles, OCR of the meter photo, provider
selection, per-city rate history, a fill-to-full marker.
