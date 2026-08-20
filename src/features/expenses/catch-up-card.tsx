"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CatchUpFlow } from "@/features/expenses/catch-up-flow";
import { isDismissed, missingDays } from "@/lib/catch-up";
import { useFinanceStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { CalendarClock, X } from "lucide-react";
import { useMemo, useState } from "react";

export function CatchUpCard() {
  const expenses = useFinanceStore((state) => state.expenses);
  const reviewedDates = useFinanceStore((state) => state.profile.catchUpReviewedDates);
  const dismissedUntil = useFinanceStore((state) => state.profile.catchUpDismissedUntil);
  const dismissCatchUp = useFinanceStore((state) => state.dismissCatchUp);
  const [session, setSession] = useState<{
    id: number;
    days: string[];
    olderCount: number;
  } | null>(null);

  const queue = useMemo(() => missingDays({ expenses, reviewedDates }), [expenses, reviewedDates]);

  const open = () =>
    setSession((current) => ({
      id: (current?.id ?? 0) + 1,
      days: queue.days,
      olderCount: queue.olderCount,
    }));

  const flow = session ? (
    // Keyed by session: "Keep going" hands over a fresh list, and without a
    // remount the walk would resume at the index it finished the last one on
    // and report the new days as already done.
    <CatchUpFlow
      key={session.id}
      days={session.days}
      olderCount={session.olderCount}
      onContinue={open}
      onClose={() => setSession(null)}
    />
  ) : null;

  // The flow stays mounted once running: emptying the queue is exactly what
  // finishing looks like, and unmounting on that would close it mid-walk.
  if (queue.days.length === 0 || isDismissed(dismissedUntil)) return flow;

  const count = queue.days.length;

  return (
    <>
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {count} {count === 1 ? "day" : "days"} not recorded
            </p>
            {queue.lastRecordedDay && (
              <p className="mt-0.5 text-xs text-muted">
                Last entry {formatDate(queue.lastRecordedDay)}
              </p>
            )}
            <Button size="sm" className="mt-3" onClick={open}>
              Catch up
            </Button>
          </div>
          <button
            type="button"
            aria-label="Hide until tomorrow"
            className="shrink-0 rounded-lg p-1 text-muted hover:bg-surface-2"
            onClick={dismissCatchUp}
          >
            <X className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>

      {flow}
    </>
  );
}
