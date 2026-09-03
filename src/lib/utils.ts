import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * `card-shadow` is one of ours, so tailwind-merge has to be told it is a shadow.
 *
 * It is a plain class in globals.css, which puts it outside `@layer utilities`
 * and therefore ahead of every Tailwind utility in the cascade — so
 * `shadow-none` never removed it. A dozen call sites passed `shadow-none` to a
 * `Card` believing it did, and every one of them was still casting a shadow;
 * transparent cards cast them over nothing at all. Grouping it with the shadow
 * utilities means the last one written wins, which is what those call sites
 * already assume.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { shadow: ["card-shadow"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  JPY: "¥",
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code + " ";
}

/**
 * Money, with paise shown only when there are paise to show.
 *
 * `minimumFractionDigits: 0` keeps whole amounts looking the way they always
 * did — ₹1,00,000 rather than ₹1,00,000.00 — while a fractional amount survives
 * to two places. Rounding every figure used to mean a ₹150.50 fuel fill was
 * entered correctly, stored correctly, and then displayed as ₹151 on every
 * screen, so the number on screen never matched the one that was typed.
 */
export function formatMoney(amount: number, currency = "INR", _compact = false): string {
  void _compact;
  const locale = CURRENCY_LOCALES[currency] ?? "en-US";
  // Round to paise before deciding, so a computed 149.999 reads as ₹150 rather
  // than ₹150.00, and so the choice is made on what will actually be printed.
  // Both digit counts are pinned: leaving the minimum at 0 gives ₹150.5, which
  // is not how money is written.
  const rounded = Math.round(amount * 100) / 100;
  const fractionDigits = Number.isInteger(rounded) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(rounded);
  } catch {
    return `${currencySymbol(currency)}${new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(rounded)}`;
  }
}

const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  AED: "en-AE",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  JPY: "ja-JP",
};

export function formatDate(iso: string): string {
  return parseFinancialDate(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function parseFinancialDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnly) return new Date(value);
  return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12);
}

export function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateInputToIso(value: string): string {
  return parseFinancialDate(value).toISOString();
}

/**
 * Newest first, parsing each date exactly once.
 *
 * The comparator used to call parseFinancialDate on both sides of every
 * comparison, which is O(n log n) parses — each one a regex plus a Date
 * construction — for a list the expenses page re-sorts on every keystroke in
 * its filter box. Decorating first makes it O(n), and `sort` on the decorated
 * array is still stable, so same-day entries keep their original order.
 */
export function newestFirst<T extends { date: string }>(items: T[]): T[] {
  return items
    .map((item) => ({ item, time: parseFinancialDate(item.date).getTime() }))
    .sort((first, second) => second.time - first.time)
    .map((entry) => entry.item);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
