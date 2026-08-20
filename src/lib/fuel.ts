import type { Expense, Vehicle } from "./types";
import { parseFinancialDate } from "./utils";

/**
 * The vehicle a profile falls back to before the user has set one.
 *
 * The range is what an Activa 125 really returns, not the brochure figure. It
 * exists to catch a forgotten fill: an unlogged stop makes the next segment's
 * distance cover fuel that was never recorded, producing an inflated and
 * entirely believable mileage that would otherwise drag the lifetime average up
 * unnoticed.
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
 * to full; under partial top-ups it is approximate per segment, and the errors —
 * differences in tank level between the two stops — cancel as fills accumulate.
 * Attributing the earlier fill's litres would be wrong by the same magnitude and
 * would additionally lag by one segment.
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
    .filter((point) => point.id !== excludeId && parseFinancialDate(point.date).getTime() <= cutoff)
    .map((point) => point.odometerKm);

  return readings.length > 0 ? Math.max(...readings) : null;
}
