import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-4)}`;
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

export function formatMoney(
  amount: number,
  currency = "INR",
  compact = false
): string {
  const sym = currencySymbol(currency);
  if (compact && Math.abs(amount) >= 1000) {
    const formatted = new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
    return `${sym}${formatted}`;
  }
  return `${sym}${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))}`;
}

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

export function newestFirst<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort(
    (first, second) => parseFinancialDate(second.date).getTime() - parseFinancialDate(first.date).getTime(),
  );
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
