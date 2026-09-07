import { cycleInfo } from "./calculations";
import type { AppNotification, SalaryProfile } from "./types";
import { formatMoney } from "./utils";

/** The fields a salary-day notification is built from, before it is stored. */
export type SalaryNotificationDraft = Pick<AppNotification, "title" | "body" | "type" | "href"> & {
  dedupeKey: string;
};

function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The notification owed for today, or null on any other day.
 *
 * Salary day is read from `cycleInfo` rather than compared against
 * `profile.salaryDay` directly, so the two agree by construction: a monthly
 * cycle clamped to a short month (the 31st in February) and a weekly cycle
 * counted from its anchor both land wherever the cycle actually starts.
 *
 * `dedupeKey` is the cycle's own start date, which is what makes calling this
 * on every load safe — the unique (userId, dedupeKey) index turns the second
 * and subsequent writes of a cycle into no-ops.
 */
export function salaryDayNotification(
  profile: SalaryProfile,
  now = new Date(),
): SalaryNotificationDraft | null {
  const { cycleStart, cycleLength } = cycleInfo(profile, now);
  const todayKey = localDayKey(now);
  if (localDayKey(cycleStart) !== todayKey) return null;

  const amount = formatMoney(profile.amount, profile.currency);

  return {
    title: "Salary day",
    body: `${amount} lands today. Your new cycle covers the next ${cycleLength} days — plan it before it is spent.`,
    type: "salary",
    href: "/dashboard",
    dedupeKey: `salary:${todayKey}`,
  };
}
