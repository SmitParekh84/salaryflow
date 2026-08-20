"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { goalSaved } from "@/lib/allocations";
import { useFinanceStore } from "@/lib/store";
import type { AccountTransferMode } from "@/lib/types";
import { localDateInputValue } from "@/lib/utils";
import { useState } from "react";

const EMPTY_TRANSFER_FORM = {
  sourceAccountId: "",
  destinationAccountId: "",
  amount: 0,
  date: localDateInputValue(),
  note: "",
  goalId: "",
  goalAmount: 0,
};

/**
 * Moving money between two of your own accounts.
 *
 * This used to live inside `AccountsView`, which meant the only way to reach it
 * was to be on that page already — the bottom bar's add button could offer
 * "Transfer money" but could only navigate there and leave you to find the
 * button again. Nothing about the form needs the accounts page, so it is its own
 * component and both callers mount it.
 *
 * Three ways to record one: schedule it for later, log one you already made, or
 * move the balances now. The store decides what each mode does to the balances
 * and refuses a transfer whose source cannot cover it.
 */
export function TransferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useFinanceStore((state) => state.accounts);
  const goals = useFinanceStore((state) => state.goals);
  const addAccountTransfer = useFinanceStore((state) => state.addAccountTransfer);

  const [form, setForm] = useState(EMPTY_TRANSFER_FORM);
  const [error, setError] = useState("");
  const [seeded, setSeeded] = useState(false);

  const activeAccounts = accounts.filter((account) => account.status === "active");

  /*
   * Seed the two account pickers when the sheet opens, and forget it again on
   * close so the next transfer starts clean. Adjusted during render rather than
   * in an effect: an effect would paint the previous transfer's numbers for a
   * frame before replacing them.
   */
  if (open && !seeded) {
    setSeeded(true);
    setForm({
      ...EMPTY_TRANSFER_FORM,
      date: localDateInputValue(),
      sourceAccountId: activeAccounts[0]?.id ?? "",
      destinationAccountId: activeAccounts[1]?.id ?? "",
    });
    setError("");
  }
  if (!open && seeded) setSeeded(false);

  function save(mode: AccountTransferMode) {
    // Reserving more for a goal than the transfer carries would credit the goal
    // with money that never arrived.
    if (form.goalAmount > form.amount) {
      setError("The goal amount cannot be more than the transfer amount.");
      return;
    }
    const success = addAccountTransfer(
      {
        ...form,
        amount: Number(form.amount),
        goalId: form.goalId || undefined,
        goalAmount: form.goalId ? Number(form.goalAmount) : undefined,
        date: new Date(`${form.date}T12:00:00`).toISOString(),
        note: form.note.trim() || undefined,
      },
      mode,
    );
    if (!success) {
      setError("Choose two different accounts and check the source balance.");
      return;
    }
    onClose();
  }

  const accountOptions = activeAccounts.map((account) => (
    <option key={account.id} value={account.id}>
      {account.bankName}
      {account.hiddenFromAccounts ? " (hidden)" : ""}
    </option>
  ));

  return (
    <Modal open={open} onClose={onClose} title="Transfer between banks">
      <div className="space-y-4">
        {/* Two accounts are the whole premise; saying so beats an empty picker. */}
        {activeAccounts.length < 2 && (
          <p className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            A transfer needs two active accounts. Add another on the Accounts page first.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="transfer-from">From</Label>
            <Select
              id="transfer-from"
              value={form.sourceAccountId}
              onChange={(event) => setForm({ ...form, sourceAccountId: event.target.value })}
            >
              {accountOptions}
            </Select>
          </div>
          <div>
            <Label htmlFor="transfer-to">To</Label>
            <Select
              id="transfer-to"
              value={form.destinationAccountId}
              onChange={(event) => {
                const destinationAccountId = event.target.value;
                // A goal tied to a specific account stops being a valid target
                // once the money is going somewhere else.
                const selectedGoal = goals.find((goal) => goal.id === form.goalId);
                const keepGoal =
                  selectedGoal &&
                  (!selectedGoal.preferredAccountId ||
                    selectedGoal.preferredAccountId === destinationAccountId);
                setForm({
                  ...form,
                  destinationAccountId,
                  goalId: keepGoal ? form.goalId : "",
                  goalAmount: keepGoal ? form.goalAmount : 0,
                });
              }}
            >
              {accountOptions}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="transfer-amount">Amount</Label>
            <Input
              id="transfer-amount"
              type="number"
              step="0.01"
              inputMode="decimal"
              min={0.01}
              value={form.amount || ""}
              onChange={(event) => {
                const amount = Number(event.target.value);
                setForm({
                  ...form,
                  amount,
                  goalAmount: form.goalId ? Math.min(form.goalAmount, amount) : 0,
                });
              }}
            />
          </div>
          <div>
            <Label htmlFor="transfer-date">Transfer date</Label>
            <Input
              id="transfer-date"
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </div>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <Label htmlFor="transfer-goal">Reserve for a goal (optional)</Label>
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            <Select
              id="transfer-goal"
              value={form.goalId}
              onChange={(event) => {
                const goalId = event.target.value;
                setForm({ ...form, goalId, goalAmount: goalId ? form.amount : 0 });
                setError("");
              }}
            >
              <option value="">Do not reserve this transfer</option>
              {goals
                .filter(
                  (goal) =>
                    !goal.balanceAccountId &&
                    goalSaved(goal, accounts) < goal.target &&
                    (!goal.preferredAccountId ||
                      goal.preferredAccountId === form.destinationAccountId),
                )
                .map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
            </Select>
            <div>
              <Label htmlFor="transfer-goal-amount">Amount to reserve</Label>
              <Input
                id="transfer-goal-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                min={0}
                max={form.amount || undefined}
                disabled={!form.goalId}
                value={form.goalAmount || ""}
                onChange={(event) => setForm({ ...form, goalAmount: Number(event.target.value) })}
              />
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Only this reserved amount counts toward the goal. Money already in the destination bank
            remains free unless you assigned it earlier.
          </p>
        </div>
        <div>
          <Label htmlFor="transfer-note">Note (optional)</Label>
          <Input
            id="transfer-note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            placeholder="e.g. October salary savings"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <ModalFooter className="flex-wrap">
          <Button
            variant="secondary"
            disabled={activeAccounts.length < 2}
            onClick={() => save("scheduled")}
          >
            Schedule
          </Button>
          <Button
            variant="secondary"
            disabled={activeAccounts.length < 2}
            onClick={() => save("already-transferred")}
          >
            Already transferred
          </Button>
          <Button disabled={activeAccounts.length < 2} onClick={() => save("transfer-now")}>
            Transfer now
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
