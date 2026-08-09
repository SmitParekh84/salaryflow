"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { accountFree, goalSaved } from "@/lib/allocations";
import { useFinanceStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { useMemo, useState } from "react";

/**
 * Splits an amount of real money across goals. Used from three places: after a
 * transfer completes, from the dashboard Add menu, and from an account's free
 * balance. Inputs are clamped so a split can never exceed what is available.
 */
export function AllocationSheet({
  open,
  onClose,
  accountId,
  amount,
  transferId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  amount?: number;
  transferId?: string;
  title?: string;
}) {
  const goals = useFinanceStore((state) => state.goals);
  const accounts = useFinanceStore((state) => state.accounts);
  const allocate = useFinanceStore((state) => state.allocate);
  const currency = useFinanceStore((state) => state.profile.currency);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const account = accounts.find((candidate) => candidate.id === accountId);
  const freeNow = account ? accountFree(goals, account) : 0;
  const available = amount ?? freeNow;
  const assigned = useMemo(
    () => Object.values(draft).reduce((sum, value) => sum + (value || 0), 0),
    [draft],
  );

  if (!account) return null;

  const left = available - assigned;

  function setAmount(goalId: string, next: number) {
    const others = Object.entries(draft)
      .filter(([id]) => id !== goalId)
      .reduce((sum, [, value]) => sum + (value || 0), 0);
    const clamped = Math.max(0, Math.min(Math.round(next) || 0, available - others));
    setDraft((current) => ({ ...current, [goalId]: clamped }));
    setError(null);
  }

  function close() {
    setDraft({});
    setError(null);
    onClose();
  }

  function save() {
    const entries = Object.entries(draft)
      .map(([goalId, value]) => ({ goalId, amount: value || 0 }))
      .filter((entry) => entry.amount > 0);
    const result = allocate(entries, accountId, transferId);
    if (!result.ok) {
      setError(result.reason ?? "Could not save this split.");
      return;
    }
    close();
  }

  return (
    <Modal open={open} onClose={close} title={title ?? "What is this money for?"}>
      <p className="text-sm text-muted">
        {formatMoney(available, currency)} available in {account.bankName}
      </p>

      <div className="mt-4 space-y-4">
        {goals.length === 0 && (
          <p className="text-sm text-muted">
            Create a goal first, then you can assign money to it.
          </p>
        )}
        {goals.map((goal) => (
          <div key={goal.id}>
            <Label htmlFor={`allocate-${goal.id}`}>{goal.name}</Label>
            <Input
              id={`allocate-${goal.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={draft[goal.id] || ""}
              onChange={(event) => setAmount(goal.id, Number(event.target.value))}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted">
              {formatMoney(goalSaved(goal), currency)} of {formatMoney(goal.target, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Left to assign</span>
          <span className={left === 0 ? "font-semibold text-success" : "font-semibold"}>
            {formatMoney(left, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Free in {account.bankName} after this</span>
          <span>{formatMoney(freeNow - assigned, currency)}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={close}>
          Skip for now
        </Button>
        <Button type="button" className="flex-1" onClick={save} disabled={assigned <= 0}>
          Save split
        </Button>
      </div>
    </Modal>
  );
}
