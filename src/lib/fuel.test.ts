import { describe, expect, it } from "vitest";
import { DEFAULT_VEHICLE, buildSegments, previousOdometer } from "./fuel";
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
