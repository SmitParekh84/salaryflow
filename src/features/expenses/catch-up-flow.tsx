"use client";

import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { dayLabel, expensesOnDay } from "@/lib/catch-up";
import { useFinanceStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";

/**
 * Walks a frozen list of missing days, oldest first.
 *
 * `days` is a snapshot taken when the flow opened, never the live queue.
 * Marking a day reviewed removes it from the live queue, and re-reading it
 * mid-walk would shift every remaining index under the user.
 */
export function CatchUpFlow({
  days,
  olderCount,
  onContinue,
  onClose,
}: {
  days: string[];
  olderCount: number;
  onContinue: () => void;
  onClose: () => void;
}) {
  const expenses = useFinanceStore((state) => state.expenses);
  const currency = useFinanceStore((state) => state.profile.currency);
  const markDayReviewed = useFinanceStore((state) => state.markDayReviewed);
  const [index, setIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const day = days[index];
  const done = day === undefined;
  // Asked of the data rather than tracked in state: ExpenseForm closes the same
  // way whether it saved or was cancelled, and a day filled from anywhere else
  // counts just as much.
  const recorded = day ? expensesOnDay(expenses, day) : [];

  const advance = () => setIndex((current) => current + 1);

  return (
    <>
      <Modal open={!formOpen} onClose={onClose} title={done ? "All caught up" : "Catch up"}>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm">
              Every day up to today is accounted for.
              {olderCount > 0 &&
                ` There ${olderCount === 1 ? "is" : "are"} still ${olderCount} older ${
                  olderCount === 1 ? "day" : "days"
                } further back.`}
            </p>
            <ModalFooter>
              <Button variant="secondary" onClick={onClose}>
                Finish
              </Button>
              {olderCount > 0 && <Button onClick={onContinue}>Keep going</Button>}
            </ModalFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Day {index + 1} of {days.length}
            </p>

            {recorded.length === 0 ? (
              <p className="text-base font-medium">Anything on {dayLabel(day)}?</p>
            ) : (
              <div className="space-y-2">
                <p className="text-base font-medium">{dayLabel(day)} recorded</p>
                <ul className="space-y-1 text-sm text-muted">
                  {recorded.map((expense) => (
                    <li key={expense.id}>
                      {formatMoney(expense.amount, currency)} ·{" "}
                      {expense.merchant || expense.category}
                    </li>
                  ))}
                </ul>
                <p className="pt-1 text-sm">Anything else on {dayLabel(day)}?</p>
              </div>
            )}

            <ModalFooter>
              <Button variant="secondary" onClick={onClose}>
                Stop for now
              </Button>
              {recorded.length === 0 ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    markDayReviewed(day);
                    advance();
                  }}
                >
                  Nothing spent
                </Button>
              ) : (
                <Button variant="secondary" onClick={advance}>
                  Done
                </Button>
              )}
              <Button onClick={() => setFormOpen(true)}>
                {recorded.length === 0 ? "Add expense" : "Add another"}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} defaultDate={day} />
    </>
  );
}
