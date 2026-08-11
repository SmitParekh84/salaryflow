/**
 * Pure helpers behind `AmountInput`.
 *
 * Money fields hold a *string*, not a number. That is deliberate: `Number("")`
 * is `0`, so a numeric field that round-trips through `Number()` cannot tell
 * "empty" from "zero" and silently writes zeros. Keeping the raw string lets
 * the schema layer decide what an empty field means.
 *
 * Nothing here clamps to min/max. Silently rewriting an amount the user typed
 * would violate the product rule against inferring financial values — out of
 * range is a validation error, not something to correct behind their back.
 */

export type Decimals = 0 | 2;

const INDIAN_LOCALE = "en-IN";

/**
 * Strips everything that cannot appear in a decimal number, keeping at most one
 * separator and at most `decimals` fraction digits. Returns "" for empty input
 * so callers can distinguish it from "0".
 */
export function sanitizeNumericInput(raw: string, decimals: Decimals = 2): string {
  if (raw === "") return "";

  const allowDecimal = decimals > 0;
  let cleaned = raw.replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, "");

  if (allowDecimal) {
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      // Keep the first separator, drop any later ones.
      cleaned = `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, "")}`;
    }
  }

  const [rawWhole = "", fraction] = cleaned.split(".");
  const whole = rawWhole.replace(/^0+(?=\d)/, "");

  if (fraction === undefined) return whole;
  return `${whole === "" ? "0" : whole}.${fraction.slice(0, decimals)}`;
}

/** Drops a dangling separator left behind mid-typing ("12." -> "12"). */
export function normalizeOnBlur(value: string): string {
  return value.endsWith(".") ? value.slice(0, -1) : value;
}

/**
 * Adds locale grouping for display while the field is not focused. Indian
 * locale gives lakh/crore grouping (12,34,567) rather than thousands.
 */
export function formatGrouped(value: string, locale = INDIAN_LOCALE): string {
  if (value === "") return "";

  const [whole, fraction] = value.split(".");
  const wholeNumber = Number(whole === "" ? "0" : whole);
  if (!Number.isFinite(wholeNumber)) return value;

  const grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(wholeNumber);
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** Reverses `formatGrouped` so a grouped display value can be edited again. */
export function stripGrouping(display: string, decimals: Decimals = 2): string {
  return sanitizeNumericInput(display, decimals);
}

/** `null` for empty or unparseable input — never a silent zero. */
export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Formats a stored number back into the string an `AmountInput` expects. */
export function toInputValue(value: number | null | undefined, decimals: Decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return decimals === 0 ? String(Math.trunc(value)) : String(value);
}
