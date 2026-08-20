"use client";

import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { AllocationSheet } from "@/features/goals/allocation-sheet";
import { defaultSavingsAccount, goalAccountBreakdown, goalSaved } from "@/lib/allocations";
import { goalContributionStep, projectGoal, whatIfDelta } from "@/lib/goal-projection";
import { GOAL_TYPES } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { BankAccount, Goal, GoalType } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import {
  Bike,
  CircleCheck,
  Landmark,
  Pencil,
  Plus,
  Smartphone,
  Target,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const EMPTY_FORM = {
  name: "",
  type: "Custom" as GoalType,
  target: 0,
  monthlyContribution: 0,
  preferredAccountId: "",
};

export function GoalsView() {
  const goals = useFinanceStore((s) => s.goals);
  const accounts = useFinanceStore((s) => s.accounts);
  const currency = useFinanceStore((s) => s.profile.currency);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const savingsAccount = defaultSavingsAccount(accounts);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setForm({
      name: goal.name,
      type: goal.type,
      target: goal.target,
      monthlyContribution: goal.monthlyContribution,
      preferredAccountId: goal.preferredAccountId ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || form.target <= 0) return;
    const goal = {
      ...form,
      preferredAccountId: form.preferredAccountId || undefined,
    };
    if (editingId) updateGoal(editingId, goal);
    else addGoal({ ...goal, saved: 0 });
    setForm(EMPTY_FORM);
    setEditingId(null);
    setOpen(false);
    await syncWithServer();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{goals.length} active goals</p>
        <div className="flex gap-2">
          {savingsAccount && goals.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => setAllocateOpen(true)}>
              <Landmark className="h-4 w-4" /> Add money
            </Button>
          )}
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New goal
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a savings goal and we'll estimate when you'll reach it."
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" /> New goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              accounts={accounts}
              currency={currency}
              onUpdateMonthly={(monthly) => updateGoal(g.id, { monthlyContribution: monthly })}
              onEdit={() => openEdit(g)}
              onDelete={() => setDeletingGoal(g)}
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit savings goal" : "New savings goal"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Goal name</Label>
              <Input
                autoFocus
                placeholder="e.g. New bike"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as GoalType })}
              >
                {GOAL_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="goal-bank">Bank for new goal money</Label>
            {editingId && goals.find((goal) => goal.id === editingId)?.balanceAccountId ? (
              <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                This goal tracks the complete balance of{" "}
                {accounts.find(
                  (account) =>
                    account.id === goals.find((goal) => goal.id === editingId)?.balanceAccountId,
                )?.bankName ?? "its linked account"}
                .
              </div>
            ) : (
              <>
                <Select
                  id="goal-bank"
                  value={form.preferredAccountId}
                  onChange={(event) => setForm({ ...form, preferredAccountId: event.target.value })}
                >
                  <option value="">Choose when adding money</option>
                  {accounts
                    .filter((account) => account.status === "active")
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName}
                      </option>
                    ))}
                </Select>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Linking a bank does not count its current balance. Only money you explicitly
                  reserve for this goal will appear as progress.
                </p>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target amount</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.target || ""}
                onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Monthly contribution</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.monthlyContribution || ""}
                onChange={(e) => setForm({ ...form, monthlyContribution: Number(e.target.value) })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>{editingId ? "Save goal" : "Create goal"}</Button>
          </ModalFooter>
        </div>
      </Modal>

      {savingsAccount && (
        <AllocationSheet
          open={allocateOpen}
          onClose={() => setAllocateOpen(false)}
          accountId={savingsAccount.id}
          title="Add money to your goals"
        />
      )}

      <AlertDialog
        open={Boolean(deletingGoal)}
        onOpenChange={(nextOpen) => !nextOpen && setDeletingGoal(null)}
        title={deletingGoal ? `Delete ${deletingGoal.name}?` : "Delete goal?"}
        description="The goal and its allocations will move to the recycle bin. Account balances will not change, and you can restore the goal later if its allocations still fit."
        confirmLabel="Delete goal"
        onConfirm={() => {
          if (!deletingGoal) return;
          deleteGoal(deletingGoal.id);
          setDeletingGoal(null);
        }}
      />
    </div>
  );
}

function GoalCard({
  goal,
  accounts,
  currency,
  onEdit,
  onDelete,
  onUpdateMonthly,
}: {
  goal: Goal;
  accounts: BankAccount[];
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateMonthly: (monthly: number) => void;
}) {
  const [whatIf, setWhatIf] = useState<number | null>(null);
  const saved = goalSaved(goal, accounts);
  const pct = goal.target > 0 ? Math.min(100, (saved / goal.target) * 100) : 0;
  const done = saved >= goal.target;
  const projection = projectGoal(goal, undefined, new Date(), accounts);
  const proposal = whatIf === null ? null : whatIfDelta(goal, whatIf, new Date(), accounts);
  const GoalIcon = goal.type === "Bike" ? Bike : goal.type === "Phone" ? Smartphone : Target;
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GoalIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{goal.name}</p>
              <p className="text-xs text-muted">{goal.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 text-muted"
              aria-label={`Edit ${goal.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-danger hover:bg-danger/10"
              aria-label={`Delete ${goal.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold">{formatMoney(saved, currency, true)}</span>
          <span className="text-xs text-muted">of {formatMoney(goal.target, currency, true)}</span>
        </div>

        <Progress
          value={pct}
          color={done ? "var(--success)" : "var(--primary)"}
          label={`${goal.name} funding progress`}
          valueText={`${formatMoney(saved, currency)} of ${formatMoney(goal.target, currency)}`}
        />

        {goal.balanceAccountId && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            Tracks{" "}
            {accounts.find((account) => account.id === goal.balanceAccountId)?.bankName ??
              "linked account"}{" "}
            balance
          </p>
        )}

        {!goal.balanceAccountId && goal.preferredAccountId && (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            New goal money goes to{" "}
            {accounts.find((account) => account.id === goal.preferredAccountId)?.bankName ??
              "linked account"}
            ; existing balance is not counted
          </p>
        )}

        {goalAccountBreakdown(goal, accounts).map((slice) => {
          const account = accounts.find((candidate) => candidate.id === slice.accountId);
          return (
            <p
              key={slice.accountId ?? "unassigned"}
              className="flex items-center gap-1.5 text-xs text-muted"
            >
              <Landmark className="h-3.5 w-3.5 shrink-0" />
              {account
                ? `Held in ${account.bankName}: ${formatMoney(slice.amount, currency)}`
                : `${formatMoney(slice.amount, currency)} not linked to an account`}
            </p>
          );
        })}

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            {done ? (
              <span className="flex items-center gap-1 text-success">
                <CircleCheck className="h-3.5 w-3.5" /> Achieved
              </span>
            ) : projection ? (
              `At ${formatMoney(goal.monthlyContribution, currency, true)}/month → done ${projection.label}`
            ) : (
              "Set a monthly amount to see a finish date"
            )}
          </span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>

        {!done && goal.monthlyContribution > 0 && (
          <div className="pt-1">
            <Label htmlFor={`whatif-${goal.id}`}>What if I save more?</Label>
            <input
              id={`whatif-${goal.id}`}
              type="range"
              min={goal.monthlyContribution}
              max={goal.monthlyContribution * 3}
              step={goalContributionStep(goal.monthlyContribution)}
              value={whatIf ?? goal.monthlyContribution}
              onChange={(event) => setWhatIf(Number(event.target.value))}
              className="w-full accent-primary"
            />
            {proposal && proposal.monthsSooner > 0 && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  {formatMoney(whatIf ?? 0, currency, true)}/month → {proposal.label},{" "}
                  {proposal.monthsSooner} months sooner
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onUpdateMonthly(whatIf ?? goal.monthlyContribution);
                    setWhatIf(null);
                  }}
                >
                  Make this my plan
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
