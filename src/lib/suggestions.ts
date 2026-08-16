import type { Expense } from "./types";
import { parseFinancialDate } from "./utils";

/**
 * Suggestions for the free-text fields on an expense, drawn from what the user
 * has already recorded.
 *
 * These fields cannot become pickers: a place you have never been to must
 * always be typeable. So this ranks history as a shortcut and never as a
 * constraint.
 */

interface Tally {
  /** The spelling to offer, taken from the most recent use. */
  label: string;
  count: number;
  lastUsed: number;
}

function tally(entries: { value: string | undefined; date: string }[]): string[] {
  const seen = new Map<string, Tally>();

  for (const entry of entries) {
    const label = entry.value?.trim();
    if (!label) continue;

    // Case-insensitive: "Blinkit", "blinkit" and "BLINKIT" are one place the
    // user typed inconsistently, not three places worth offering separately.
    const key = label.toLowerCase();
    const usedAt = parseFinancialDate(entry.date).getTime();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, { label, count: 1, lastUsed: usedAt });
      continue;
    }

    existing.count += 1;
    if (usedAt >= existing.lastUsed) {
      existing.lastUsed = usedAt;
      // Offer the spelling from the most recent use — the way the user writes
      // it now, rather than however they first typed it.
      existing.label = label;
    }
  }

  return [...seen.values()]
    .sort((first, second) => {
      // Repetition is the strongest signal that a name is worth one tap:
      // groceries and fuel recur, a one-off restaurant does not.
      if (first.count !== second.count) return second.count - first.count;
      if (first.lastUsed !== second.lastUsed) return second.lastUsed - first.lastUsed;
      return first.label.localeCompare(second.label);
    })
    .map((entry) => entry.label);
}

/** Places and titles from past expenses, most useful first. */
export function merchantSuggestions(expenses: Expense[]): string[] {
  return tally(expenses.map((expense) => ({ value: expense.merchant, date: expense.date })));
}

/** Friends from past splits, most useful first. */
export function friendNameSuggestions(expenses: Expense[]): string[] {
  return tally(
    expenses.map((expense) => ({ value: expense.shared?.friendName, date: expense.date })),
  );
}

export const SUGGESTION_LIMIT = 6;

/**
 * Narrows a suggestion list to what the user is part-way through typing.
 *
 * A name already typed in full is dropped: there is nothing left to complete,
 * and leaving it there means the list covers the field for no reason.
 */
export function filterSuggestions(
  suggestions: string[],
  query: string,
  limit = SUGGESTION_LIMIT,
): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return suggestions.slice(0, limit);

  const matches: { label: string; startsWith: boolean }[] = [];
  for (const label of suggestions) {
    const haystack = label.toLowerCase();
    if (haystack === needle) continue;
    const at = haystack.indexOf(needle);
    if (at === -1) continue;
    matches.push({ label, startsWith: at === 0 });
  }

  return matches
    .sort((first, second) => Number(second.startsWith) - Number(first.startsWith))
    .slice(0, limit)
    .map((match) => match.label);
}
