import { describe, expect, it } from "vitest";
import { DEFAULT_VEHICLE, buildSegments, fuelSummary, previousOdometer } from "./fuel";
import type { Expense, FuelFill } from "./types";

function fill(id: string, date: string, amount: number, fuel?: Partial<FuelFill>): Expense {
  return {
    id,
    amount,
    category: "Fuel",
    paymentMethod: "UPI",
    date,
    ...(fuel
      ? {
          fuel: {
            litres: amount / 105,
            ratePerLitre: 105,
            rateSource: "manual",
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
    expect(buildSegments([AUG_20, same], DEFAULT_VEHICLE)).toEqual([]);
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
