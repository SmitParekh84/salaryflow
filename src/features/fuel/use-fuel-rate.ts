"use client";

import { useFinanceStore } from "@/lib/store";
import type { Expense, FuelFill } from "@/lib/types";
import { parseFinancialDate } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

export type RateSource = FuelFill["rateSource"];

/** The rate from the most recent fill that recorded one. */
export function lastUsedRate(expenses: Expense[]): number | null {
  const rate = expenses
    .filter((expense) => expense.category === "Fuel" && expense.fuel)
    .sort((a, b) => parseFinancialDate(b.date).getTime() - parseFinancialDate(a.date).getTime())[0]
    ?.fuel?.ratePerLitre;

  return typeof rate === "number" && rate > 0 ? rate : null;
}

/**
 * The rate to prefill, and where it came from.
 *
 * Falls through: a live lookup, then the last rate the user actually paid, then
 * nothing and they type it. The last-used value is derived during render rather
 * than pushed into state by an effect, so the field is never briefly empty while
 * a request is in flight.
 *
 * The effect depends on `city` and `enabled` only. Depending on `expenses` would
 * re-issue the request every time an unrelated expense changed while the form
 * sat open.
 */
export function useFuelRate(enabled: boolean): { rate: number | null; source: RateSource } {
  const city = useFinanceStore((state) => state.profile.city);
  const expenses = useFinanceStore((state) => state.expenses);
  const fallback = useMemo(() => lastUsedRate(expenses), [expenses]);
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !city) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/fuel-price?city=${encodeURIComponent(city)}`, {
          credentials: "include",
        });
        if (!response.ok) return;

        const json = await response.json();
        if (cancelled || json?.configured !== true) return;
        setLive(json.rate);
      } catch {
        // Offline at a pump is the expected case here, not an error to report.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, city]);

  return { rate: live ?? fallback, source: live !== null ? "live" : "last-used" };
}

/**
 * Where a saved rate came from.
 *
 * Decided by comparing what was submitted against what was offered, rather than
 * by watching for keystrokes: a user who edits the field and then types the
 * suggestion back has not really overridden anything, and one who never touches
 * a field they had to correct last week has.
 */
export function resolveRateSource(
  submitted: number,
  suggested: number | null,
  suggestedSource: RateSource,
): RateSource {
  return suggested !== null && submitted === suggested ? suggestedSource : "manual";
}
