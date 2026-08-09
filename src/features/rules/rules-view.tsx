"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { useSummary } from "@/hooks/use-summary";
import { BUDGET_RULE_TEMPLATES, createRuleFromTemplate } from "@/lib/budget-rules";
import { useFinanceStore } from "@/lib/store";
import type { BudgetBucketKind } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { Check, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

const BUCKETS: { kind: BudgetBucketKind; label: string }[] = [
  { kind: "needs", label: "Needs" },
  { kind: "wants", label: "Wants" },
  { kind: "savings", label: "Cash savings" },
  { kind: "investments", label: "Investments" },
];

const USED_LABELS: Record<Exclude<BudgetBucketKind, "savings">, string> = {
  needs: "Spent this cycle",
  wants: "Spent this cycle",
  investments: "Invested this cycle",
};

export function RulesView() {
  const rules = useFinanceStore((state) => state.budgetRules);
  const addRule = useFinanceStore((state) => state.addBudgetRule);
  const activateRule = useFinanceStore((state) => state.activateBudgetRule);
  const deleteRule = useFinanceStore((state) => state.deleteBudgetRule);
  const syncWithServer = useFinanceStore((state) => state.syncWithServer);
  const summary = useSummary();
  const currency = useFinanceStore((state) => state.profile.currency);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("My budget rule");
  const [percentages, setPercentages] = useState<Record<BudgetBucketKind, number>>({
    needs: 50,
    wants: 20,
    savings: 15,
    investments: 15,
  });
  const activeRule = rules.find((rule) => rule.active);
  const total =
    percentages.needs + percentages.wants + percentages.savings + percentages.investments;

  async function applyTemplate(templateKey: string) {
    const existing = rules.find((rule) => rule.templateKey === templateKey);
    if (existing) {
      activateRule(existing.id);
    } else {
      const template = BUDGET_RULE_TEMPLATES.find((item) => item.key === templateKey);
      if (!template) return;
      addRule(createRuleFromTemplate(template));
    }
    await syncWithServer();
  }

  async function saveCustomRule() {
    if (!name.trim() || total !== 100) return;
    addRule({
      name: name.trim(),
      active: true,
      allocations: BUCKETS.map((bucket) => ({
        ...bucket,
        percentage: percentages[bucket.kind],
      })),
    });
    setOpen(false);
    await syncWithServer();
  }

  async function makeActive(id: string) {
    activateRule(id);
    await syncWithServer();
  }

  async function remove(id: string) {
    deleteRule(id);
    await syncWithServer();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Use four separate limits for needs, wants, cash savings, and investments. The active
            rule updates safe-to-spend and Salary Plan amounts across the app.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Custom rule
        </Button>
      </div>

      {activeRule && (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">{activeRule.name}</h2>
              </div>
              <p className="mt-1 text-xs text-muted">
                Active across spending, cash savings, investments, Salary Plan, and health score
              </p>
            </div>
            {summary.budgetRuleScore !== undefined && (
              <div className="text-right">
                <p className="text-2xl font-bold">{summary.budgetRuleScore}/100</p>
                <p className="text-xs text-muted">adherence</p>
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {activeRule.allocations.map((allocation) => {
              const progress = summary.budgetProgress?.[allocation.kind];
              const remaining = progress?.remaining ?? 0;
              const usagePercentage =
                ((progress?.used ?? 0) / Math.max(1, progress?.target ?? 0)) * 100;
              const isSpendingLimit =
                allocation.kind === "needs" || allocation.kind === "wants";
              const isOffTrack = isSpendingLimit ? remaining < 0 : remaining > 0;
              return (
                <div key={allocation.kind}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium">{allocation.label}</span>
                    <span className="text-muted">{allocation.percentage}% of salary</span>
                  </div>
                  <Progress
                    value={usagePercentage}
                    color={isOffTrack ? "var(--danger)" : "var(--primary)"}
                    label={`${allocation.label} target usage`}
                    valueText={`${formatMoney(progress?.used ?? 0, currency)} of ${formatMoney(progress?.target ?? 0, currency)}`}
                  />
                  <div className="mt-2 space-y-1 text-[11px]">
                    <p className="flex justify-between gap-2 font-medium">
                      <span>Progress</span>
                      <span className={isOffTrack ? "text-danger" : "text-foreground"}>
                        {Math.round(usagePercentage)}%
                      </span>
                    </p>
                    <p className="flex justify-between gap-2 text-muted">
                      <span>Target</span>
                      <span>{formatMoney(progress?.target ?? 0, currency)}</span>
                    </p>
                    <p className="flex justify-between gap-2 text-muted">
                      <span>
                        {allocation.kind === "savings"
                          ? "Saved this cycle"
                          : USED_LABELS[allocation.kind]}
                      </span>
                      <span>{formatMoney(progress?.used ?? 0, currency)}</span>
                    </p>
                    <p
                      className={`flex justify-between gap-2 font-medium ${isOffTrack ? "text-danger" : "text-success"}`}
                    >
                      <span>
                        {isSpendingLimit
                          ? remaining < 0
                            ? "Over limit"
                            : "Limit left"
                          : remaining > 0
                            ? "Still needed"
                            : "Above target"}
                      </span>
                      <span>{formatMoney(Math.abs(remaining), currency)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <section>
        <h2 className="text-base font-semibold">Adviser templates</h2>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {BUDGET_RULE_TEMPLATES.map((template) => {
            const selected = activeRule?.templateKey === template.key;
            return (
              <div
                key={template.key}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{template.name}</p>
                    {template.key === "wealth-builder-50-20-15-15" && (
                      <Badge color="var(--primary)">Recommended for you</Badge>
                    )}
                    {selected && <Badge color="var(--success)">Active</Badge>}
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                    {template.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {template.allocations.map((allocation) => (
                    <span
                      key={allocation.kind}
                      className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-medium"
                    >
                      {allocation.label} {allocation.percentage}%
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant={selected ? "secondary" : "primary"}
                  disabled={selected}
                  onClick={() => void applyTemplate(template.key)}
                >
                  {selected ? (
                    <>
                      <Check className="h-4 w-4" /> Active
                    </>
                  ) : (
                    "Use rule"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {rules.some((rule) => !rule.templateKey) && (
        <section>
          <h2 className="text-base font-semibold">Custom rules</h2>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {rules
              .filter((rule) => !rule.templateKey)
              .map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{rule.name}</p>
                      {rule.active && <Badge color="var(--success)">Active</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {rule.allocations
                        .map((allocation) => `${allocation.label} ${allocation.percentage}%`)
                        .join(" · ")}
                    </p>
                  </div>
                  {!rule.active && (
                    <Button size="sm" variant="secondary" onClick={() => void makeActive(rule.id)}>
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void remove(rule.id)}
                    className="h-8 w-8 text-danger hover:bg-danger/10"
                    aria-label={`Delete ${rule.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        </section>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create budget rule">
        <div className="space-y-4">
          <div>
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {BUCKETS.map((bucket) => (
            <div key={bucket.kind}>
              <Label htmlFor={`rule-${bucket.kind}`}>{bucket.label} percentage</Label>
              <Input
                id={`rule-${bucket.kind}`}
                type="number"
                min={0}
                max={100}
                value={percentages[bucket.kind]}
                onChange={(event) =>
                  setPercentages({ ...percentages, [bucket.kind]: Number(event.target.value) })
                }
              />
            </div>
          ))}
          <div
            className={`rounded-xl px-3 py-2 text-sm ${total === 100 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
          >
            Total: {total}% {total === 100 ? "· Ready to save" : "· Must equal 100%"}
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={total !== 100 || !name.trim()} onClick={() => void saveCustomRule()}>
              Save & activate
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
