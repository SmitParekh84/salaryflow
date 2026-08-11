/**
 * Pure helpers behind `OtpInput`.
 *
 * The value is a plain digit string ("1234"), not an array of boxes, so callers
 * keep the single-string contract they already had with the old single field.
 * Box N renders `value[N]`; focus belongs at the first empty box.
 */

export function sanitizeOtp(raw: string, length: number): string {
  return raw.replace(/\D/g, "").slice(0, length);
}

/** Digits lifted out of arbitrary pasted text, e.g. "Your code is 418 302". */
export function parsePastedOtp(text: string, length: number): string {
  return sanitizeOtp(text, length);
}

export function setDigitAt(value: string, index: number, digit: string, length: number): string {
  const clean = sanitizeOtp(digit, 1);
  if (clean === "" || index < 0 || index >= length) return value;

  const chars = value.slice(0, length).split("");
  while (chars.length < index) chars.push("");
  chars[index] = clean;
  return chars.join("").slice(0, length);
}

export function removeDigitAt(value: string, index: number): string {
  if (index < 0 || index >= value.length) return value;
  return `${value.slice(0, index)}${value.slice(index + 1)}`;
}

/** Where the caret belongs: the first blank box, or the last box once full. */
export function firstEmptyIndex(value: string, length: number): number {
  return Math.min(value.length, length - 1);
}

export function isComplete(value: string, length: number): boolean {
  return value.length === length;
}
