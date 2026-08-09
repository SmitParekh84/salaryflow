import { parseFinancialDate } from "./utils";

export function currentFinancialYearStart(now = new Date()) {
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export function financialYearLabel(startYear: number) {
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function financialYearRange(startYear: number) {
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 3, 1),
  };
}

export function isInFinancialYear(date: string | Date, startYear: number) {
  const value = typeof date === "string" ? parseFinancialDate(date) : date;
  const { start, end } = financialYearRange(startYear);
  return value >= start && value < end;
}

export function financialYearMonths(startYear: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(startYear, index + 3, 1);
    return {
      date,
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
    };
  });
}

export function availableFinancialYears(dates: Array<string | undefined>, now = new Date()) {
  const current = currentFinancialYearStart(now);
  const years = new Set(Array.from({ length: 6 }, (_, index) => current - index));
  for (const value of dates) {
    if (!value) continue;
    const date = parseFinancialDate(value);
    years.add(date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1);
  }
  return Array.from(years).sort((first, second) => second - first);
}
