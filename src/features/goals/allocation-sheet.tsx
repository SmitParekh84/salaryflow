"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
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
  const [selectedId, setSelectedId] = useState(accountId);

  // Follow the caller when it points at a different account (e.g. a second
  // account's "Assign" button opens the same mounted sheet). Adjusting during
  // render is React's supported pattern for syncing state to a changed prop —
  // an effect would render once with the stale account first.
  const [syncedAccountId, setSyncedAccountId] = useState(accountId);
  if (accountId !== syncedAccountId) {
    setSyncedAccountId(accountId);
    setSelectedId(accountId);
    setDraft({});
  }

  // A transfer split is tied to the account the money actually landed in, and a
  // fixed amount belongs to that account too. Only a free-balance allocation
  // lets the user choose where the money comes from.
  const lockAccount = amount !== undefined;
  const selectableAccounts = accounts.filter((candidate) => candidate.status === "active");
  const fundableGoals = goals.filter((goal) => goalSaved(goal) < goal.target);
  const account = accounts.find((candidate) => candidate.id === selectedId);
  const freeNow = account ? accountFree(goals, account) : 0;
  const available = amount ?? freeNow;
  const assigned = useMemo(
    () => Object.values(draft).reduce((sum, value) => sum + (value || 0), 0),
    [draft],
  );

  if (!account) return null;

  const left = available - assigned;

  function setAmount(goalId: string, next: number) {
    const goal = goals.find((candidate) => candidate.id === goalId);
    const goalRemaining = goal ? Math.max(0, goal.target - goalSaved(goal)) : 0;
    const others = Object.entries(draft)
      .filter(([id]) => id !== goalId)
      .reduce((sum, [, value]) => sum + (value || 0), 0);
    const clamped = Math.max(0, Math.min(Math.round(next) || 0, available - others, goalRemaining));
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
    const result = allocate(entries, selectedId, transferId);
    if (!result.ok) {
      setError(result.reason ?? "Could not save this split.");
      return;
    }
    close();
  }

  return (
    <Modal open={open} onClose={close} title={title ?? "What is this money for?"}>
      {lockAccount ? (
        <p className="text-sm text-muted">
          {formatMoney(available, currency)} available in {account.bankName}
        </p>
      ) : (
        <div>
          <Label htmlFor="allocate-account">Money comes from</Label>
          <Select
            id="allocate-account"
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setDraft({});
              setError(null);
            }}
          >
            {selectableAccounts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.bankName} — {formatMoney(accountFree(goals, candidate), currency)} free
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-muted">
            {formatMoney(available, currency)} free to assign in {account.bankName}
          </p>
        </div>
      )}

      <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-muted">
        Assigning reserves money already in this account. It updates goal progress but does not
        count as Cash saved this cycle.
      </p>

      <div className="mt-4 space-y-4">
        {goals.length === 0 && (
          <p className="text-sm text-muted">
            Create a goal first, then you can assign money to it.
          </p>
        )}
        {goals.length > 0 && fundableGoals.length === 0 && (
          <p className="text-sm text-muted">All goals are already fully funded.</p>
        )}
        {fundableGoals.map((goal) => (
          <div key={goal.id}>
            <Label htmlFor={`allocate-${goal.id}`}>{goal.name}</Label>
            <Input
              id={`allocate-${goal.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={Math.max(0, goal.target - goalSaved(goal))}
              value={draft[goal.id] || ""}
              onChange={(event) => setAmount(goal.id, Number(event.target.value))}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted">
              {formatMoney(goalSaved(goal), currency)} of {formatMoney(goal.target, currency)} ·{" "}
              {formatMoney(goal.target - goalSaved(goal), currency)} remaining
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
