import { z } from "zod";

/**
 * Field-level building blocks shared by the API routes and the client forms.
 *
 * One schema serves both sides. Routes receive JSON numbers; forms hold strings
 * because `AmountInput` keeps its value as text. The preprocessor below accepts
 * either.
 *
 * It deliberately does *not* use `z.coerce.number()`: that turns `""` into `0`,
 * which is exactly the bug this layer exists to remove — a cleared amount field
 * would silently persist as zero. Blank becomes `undefined` so a required field
 * reports "is required" and an optional one stays absent.
 */

/** Text that cannot be read as a number is passed through so `z.number()` rejects it. */
function toNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : trimmed;
}

function sentenceCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type NumberFieldOptions = {
  min?: number;
  max?: number;
  integer?: boolean;
  /** Used in the error message, lower-case: "Enter a valid salary day". */
  label?: string;
};

function numberBase({ min, max, integer, label = "value" }: NumberFieldOptions) {
  let schema = z.number({
    error: (issue) =>
      issue.input === undefined || issue.input === null
        ? `${sentenceCase(label)} is required`
        : `Enter a valid ${label}`,
  });

  if (integer) schema = schema.int(`${sentenceCase(label)} must be a whole number`);
  if (min !== undefined) {
    schema =
      min === 0
        ? schema.min(0, `${sentenceCase(label)} cannot be negative`)
        : schema.min(min, `${sentenceCase(label)} must be at least ${min}`);
  }
  if (max !== undefined) schema = schema.max(max, `${sentenceCase(label)} cannot exceed ${max}`);

  return schema;
}

export function requiredNumber(options: NumberFieldOptions = {}) {
  return z.preprocess(toNumber, numberBase(options));
}

export function optionalNumber(options: NumberFieldOptions = {}) {
  return z.preprocess(toNumber, numberBase(options).optional());
}

/** Money that must be present and cannot be negative. */
export function money(label = "amount", options: NumberFieldOptions = {}) {
  return requiredNumber({ min: 0, label, ...options });
}

/** Money that must be present and greater than zero. */
export function positiveMoney(label = "amount") {
  return z.preprocess(
    toNumber,
    numberBase({ label }).gt(0, `${sentenceCase(label)} must be greater than 0`),
  );
}

export function optionalMoney(label = "amount") {
  return optionalNumber({ min: 0, label });
}

/** Day of the month, as used by salary day and credit-card statement day. */
export function dayOfMonth(label = "day") {
  return requiredNumber({ min: 1, max: 31, integer: true, label });
}

export function percentage(label = "percentage") {
  return requiredNumber({ min: 0, max: 100, label });
}

export function requiredText(label = "name", max = 120) {
  return z
    .string({ error: `${sentenceCase(label)} is required` })
    .trim()
    .min(1, `${sentenceCase(label)} is required`)
    .max(max, `${sentenceCase(label)} cannot exceed ${max} characters`);
}

export function optionalText(max = 500) {
  // Blank has to become `undefined` before validation. Chaining `.optional()`
  // onto a string schema would let "" satisfy the string branch and come back
  // as an empty string rather than an absent field.
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max, `Cannot exceed ${max} characters`).optional(),
  );
}

/** Accepts an empty field, but rejects text that is present and malformed. */
export const optionalEmail = z
  .union([z.literal(""), z.string().trim().email("Enter a valid email address")])
  .optional();

export const requiredEmail = z
  .string({ error: "Email is required" })
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");
