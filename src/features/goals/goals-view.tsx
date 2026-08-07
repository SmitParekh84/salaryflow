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
import { Plus, Target, Trash2 } from "lucide-react";
import { useState } from "react";

export function GoalsView() {
  const goals = useFinanceStore((s) => s.goals);
  const currency = useFinanceStore((s) => s.profile.currency);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const deleteGoal = useFinanceStore((s) => s.deleteGoal);
  const contributeGoal = useFinanceStore((s) => s.contributeGoal);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "Custom" as GoalType,
    target: 0,
    saved: 0,
    monthlyContribution: 0,
  });

  const save = () => {
    if (!form.name || form.target <= 0) return;
    addGoal(form);
    setForm({ name: "", type: "Custom", target: 0, saved: 0, monthlyContribution: 0 });
    setOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{goals.length} active goals</p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set a savings goal and we'll estimate when you'll reach it."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
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
              currency={currency}
              onDelete={() => deleteGoal(g.id)}
              onContribute={(amt) => contributeGoal(g.id, amt)}
            />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New savings goal">
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
                onChange={(e) => setForm({ ...form, saved: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Monthly contribution</Label>
            <Input
              type="number"
              value={form.monthlyContribution || ""}
              onChange={(e) =>
                setForm({ ...form, monthlyContribution: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save}>
              Create goal
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
  onDelete,
  onContribute,
}: {
  goal: Goal;
  currency: string;
  onDelete: () => void;
  onContribute: (amount: number) => void;
}) {
  const pct = Math.min(100, (goal.saved / goal.target) * 100);
  const done = goal.saved >= goal.target;
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">{goal.name}</p>
            <p className="text-xs text-muted">{goal.type}</p>
          </div>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
            aria-label="Delete goal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold">
            {formatMoney(goal.saved, currency, true)}
          </span>
          <span className="text-xs text-muted">
            of {formatMoney(goal.target, currency, true)}
          </span>
        </div>

        <Progress
          value={pct}
          color={done ? "var(--success)" : "var(--primary)"}
        />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            {done ? "Achieved 🎉" : `ETA ${projectedGoalDate(goal) ?? "—"}`}
          </span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>

        {!done && (
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
