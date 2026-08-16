/* ---------------------------------------------------------------------------
   Date of birth, stored as a plain `YYYY-MM-DD` calendar date.

   A birthday is a calendar date, not an instant, so it is never stored as a
   timestamp: doing that makes the stored day drift by one whenever the reading
   and writing timezones differ. Everything here reads the clock in UTC for the
   same reason — age is computed in two places (the browser showing it back to
   the user, the server building the assistant's context) and both must agree.

   Age is derived rather than stored. A typed age is correct for one year and
   silently wrong afterwards, which is exactly the kind of stale figure the
   assistant must never quote back at someone.
   --------------------------------------------------------------------------- */

const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The account's own age bounds; the assistant has no use for anything outside. */
export const MIN_AGE = 14;
export const MAX_AGE = 120;

type CalendarDate = { year: number; month: number; day: number };

/**
 * Strict parse. `new Date("2001-02-30")` rolls forward into March and stores a
 * day nobody entered, so the parsed parts are checked back against the date.
 */
function parseCalendarDate(value: string | null | undefined): CalendarDate | null {
  const match = typeof value === "string" ? PLAIN_DATE.exec(value) : null;
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/**
 * Whole years lived on `now`, or null if the date of birth is missing or
 * malformed. A birthday still to come this year has not been reached yet,
 * which is what keeps a February 29th birthday from ageing on February 28th.
 */
export function ageOn(value: string | null | undefined, now: Date): number | null {
  const born = parseCalendarDate(value);
  if (!born) return null;

  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const birthdayStillToCome = month < born.month || (month === born.month && day < born.day);

  return now.getUTCFullYear() - born.year - (birthdayStillToCome ? 1 : 0);
}

/** A storable date of birth: well formed, in the past, and a plausible age. */
export function isValidDateOfBirth(value: string | null | undefined, now: Date): boolean {
  const age = ageOn(value, now);
  return age !== null && age >= MIN_AGE && age <= MAX_AGE;
}
