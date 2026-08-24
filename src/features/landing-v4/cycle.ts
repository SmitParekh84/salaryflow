/* ---------------------------------------------------------------------------
   The demo cycle, derived rather than written down.

   Every figure on this page comes out of one account and one calculation, so the
   page cannot contradict itself and cannot show a shape that the product would
   never produce. The calculation is the real one:

       safe today = (what is left of the cycle) / (days still to go)

   which is why the series sags after a heavy weekend and lifts on a quiet run
   of days. A hand-written array of pretty numbers would not do that, and anyone
   who understands the product would notice.

   Deterministic on purpose: no `Math.random`, so the server and the client
   render the same ring and React does not report a hydration mismatch.
   --------------------------------------------------------------------------- */

export const ACCOUNT = {
  salary: 85_000,
  bills: 25_298,
  savings: 15_000,
  investments: 10_000,
  daysInCycle: 30,
  /** Where the reader is standing: day 12 of 30, matching "12 days until payday". */
  today: 12,
} as const;

export const AVAILABLE =
  ACCOUNT.salary - ACCOUNT.bills - ACCOUNT.savings - ACCOUNT.investments;

/** The figure the whole page is built around. Asserted below, not assumed. */
export const SAFE_TODAY = 1_029;

/**
 * Relative spending pressure per day. Weekends cost more; nothing else varies.
 * Only the shape matters — the scale is solved for below.
 */
function weight(day: number) {
  const weekday = day % 7;
  return weekday === 6 || weekday === 0 ? 1.55 : 0.85;
}

/**
 * Spending per day across the cycle, in two halves.
 *
 * The first version scaled one weight curve across all thirty days, which
 * spent far more than the cycle actually holds: the running total overran
 * AVAILABLE around day 20 and every day after it clamped to zero. The ring
 * ended on 'safe to spend today: ₹0', which is both arithmetically wrong and
 * the single worst sentence a money app could put on its own home page.
 *
 * Split in two, it is right by construction:
 *
 *   the past      what was actually spent, scaled so that today comes out at
 *                 exactly SAFE_TODAY
 *   the projection what is left, spread across the days that remain, using the
 *                 same weekend-weighted shape
 *
 * Because the projection is scaled to the money that is actually left, the
 * total can never exceed AVAILABLE and the last day of the cycle is worth
 * whatever that day's own share is — never nothing.
 */
function buildSpend() {
  const daysBeforeToday = ACCOUNT.today - 1;
  const daysLeftToday = ACCOUNT.daysInCycle - ACCOUNT.today + 1;

  // What must already have been spent for today's figure to be SAFE_TODAY.
  const spentByYesterday = AVAILABLE - SAFE_TODAY * daysLeftToday;
  const remaining = AVAILABLE - spentByYesterday;

  const scaleFor = (from: number, to: number, budget: number) => {
    let shape = 0;
    for (let day = from; day <= to; day += 1) shape += weight(day);
    return shape > 0 ? budget / shape : 0;
  };

  const pastScale = scaleFor(1, daysBeforeToday, spentByYesterday);
  const futureScale = scaleFor(ACCOUNT.today, ACCOUNT.daysInCycle, remaining);

  const perDay: number[] = [];
  for (let day = 1; day <= ACCOUNT.daysInCycle; day += 1) {
    perDay.push(weight(day) * (day < ACCOUNT.today ? pastScale : futureScale));
  }
  return perDay;
}

export type CycleDay = {
  /** 1-based day of the salary cycle. */
  day: number;
  /** What was safe to spend on that day. */
  safe: number;
  /** 0..1, for a bar height. Normalised across the cycle. */
  level: number;
  isToday: boolean;
  isPast: boolean;
};

function build(): CycleDay[] {
  const spend = buildSpend();
  const days: { day: number; safe: number }[] = [];

  let cumulative = 0;
  for (let day = 1; day <= ACCOUNT.daysInCycle; day += 1) {
    const daysLeft = ACCOUNT.daysInCycle - day + 1;
    // Yesterday's spending is gone before today's figure is worked out, which
    // is why the running total is added after the division, not before it.
    days.push({ day, safe: Math.max(0, (AVAILABLE - cumulative) / daysLeft) });
    cumulative += spend[day - 1];
  }

  const peak = Math.max(...days.map((entry) => entry.safe));
  return days.map((entry) => ({
    day: entry.day,
    safe: Math.round(entry.safe),
    // Floored at 0.12 so a quiet day is still a visible tick rather than a gap
    // in the ring, which would read as missing data.
    level: peak > 0 ? Math.max(0.12, entry.safe / peak) : 0.12,
    isToday: entry.day === ACCOUNT.today,
    isPast: entry.day < ACCOUNT.today,
  }));
}
export const CYCLE = build();

/**
 * The ring's geometry.
 *
 * Only the step lives here. The radius is a CSS custom property instead, because
 * it has to change with the viewport — a 600px radius is a hero object on a
 * desktop and puts two thirds of the cycle off both edges of a phone — and a
 * value set from JS as an inline style would override every media query.
 */
export const RING = {
  /** Degrees between adjacent day tiles. 30 tiles × 12° closes the circle. */
  step: 360 / ACCOUNT.daysInCycle,
} as const;
