"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { projectedGoalDate } from "@/lib/calculations";
import { GOAL_TYPES } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { Goal, GoalType } from "@/lib/types";
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
  saved: 0,
  monthlyContribution: 0,
};

export function GoalsView() {
  const goals = useFinanceStore((s) => s.goals);
  const accounts = useFinanceStore((s) => s.accounts);
  const currency = useFinanceStore((s) => s.profile.currency);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const contributeGoal = useFinanceStore((s) => s.contributeGoal);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const savingsAccount = accounts.find((account) => account.defaultFor?.includes("savings"));

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
      saved: goal.saved,
      monthlyContribution: goal.monthlyContribution,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || form.target <= 0) return;
    const goal = {
      ...form,
      saved: form.type === "Emergency Fund" && savingsAccount ? 0 : form.saved,
    };
    if (editingId) updateGoal(editingId, goal);
    else addGoal(goal);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setOpen(false);
    await syncWithServer();
  };

  const contribute = async (id: string, amount: number) => {
    contributeGoal(id, amount);
    await syncWithServer();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{goals.length} active goals</p>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
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
              goal={
                g.type === "Emergency Fund" && savingsAccount
                  ? { ...g, saved: savingsAccount.balance }
                  : g
              }
              currency={currency}
              trackedAccountName={
                g.type === "Emergency Fund" ? savingsAccount?.bankName : undefined
              }
              onEdit={() => openEdit(g)}
              onDelete={() => deleteGoal(g.id)}
              onContribute={(amount) => void contribute(g.id, amount)}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target amount</Label>
              <Input
                type="number"
                value={form.target || ""}
                onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Already saved</Label>
              <Input
                type="number"
                value={form.saved || ""}
                disabled={form.type === "Emergency Fund" && Boolean(savingsAccount)}
                onChange={(e) => setForm({ ...form, saved: Number(e.target.value) })}
              />
              {form.type === "Emergency Fund" && savingsAccount && (
                <p className="mt-1 text-xs text-muted">Tracked from {savingsAccount.bankName}</p>
              )}
            </div>
          </div>
          <div>
            <Label>Monthly contribution</Label>
            <Input
              type="number"
              value={form.monthlyContribution || ""}
              onChange={(e) => setForm({ ...form, monthlyContribution: Number(e.target.value) })}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void save()}>
              {editingId ? "Save goal" : "Create goal"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function GoalCard({
  goal,
  currency,
  trackedAccountName,
  onEdit,
  onDelete,
  onContribute,
}: {
  goal: Goal;
  currency: string;
  trackedAccountName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: (amount: number) => void;
}) {
  const pct = Math.min(100, (goal.saved / goal.target) * 100);
  const done = goal.saved >= goal.target;
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
          <span className="text-2xl font-bold">{formatMoney(goal.saved, currency, true)}</span>
          <span className="text-xs text-muted">of {formatMoney(goal.target, currency, true)}</span>
        </div>

        <Progress
          value={pct}
          color={done ? "var(--success)" : "var(--primary)"}
          label={`${goal.name} funding progress`}
          valueText={`${formatMoney(goal.saved, currency)} of ${formatMoney(goal.target, currency)}`}
        />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            {done ? (
              <span className="flex items-center gap-1 text-success">
                <CircleCheck className="h-3.5 w-3.5" /> Achieved
              </span>
            ) : trackedAccountName ? (
              <span className="flex items-center gap-1">
                <Landmark className="h-3.5 w-3.5" /> Tracked from {trackedAccountName}
              </span>
            ) : goal.monthlyContribution > 0 ? (
              `ETA ${projectedGoalDate(goal) ?? "—"}`
            ) : (
              "Monthly funding paused"
            )}
          </span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>

        {!done && !trackedAccountName && (
          <div className="flex gap-2 pt-1">
            {[500, 1000, 5000].map((amt) => (
              <Button
                key={amt}
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => onContribute(amt)}
              >
                +{formatMoney(amt, currency, true)}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
