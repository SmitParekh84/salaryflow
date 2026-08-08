"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildFundingPlan } from "@/lib/funding-plan";
import { useFinanceStore } from "@/lib/store";
import { formatMoney, newestFirst } from "@/lib/utils";
import { CreditCard, Landmark, Receipt, TrendingUp } from "lucide-react";

const KIND_ICON = {
  "credit-card": CreditCard,
  investment: TrendingUp,
  rent: Receipt,
  subscription: Receipt,
  utility: Receipt,
  bill: Receipt,
};

export function FundingPlanView() {
  const accounts = useFinanceStore((state) => state.accounts);
  const bills = useFinanceStore((state) => state.bills);
  const creditCards = useFinanceStore((state) => state.creditCards);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const investments = useFinanceStore((state) => state.investments);
  const salaryHistory = useFinanceStore((state) => state.salaryHistory);
  const profile = useFinanceStore((state) => state.profile);
  const currency = profile.currency;
  const confirmedSalary = newestFirst(
    salaryHistory.filter((entry): entry is typeof entry & { date: string } => Boolean(entry.confirmed && entry.date)),
  )[0]?.amount;
  const salary = confirmedSalary ?? profile.amount;
  const plan = buildFundingPlan({ accounts, bills, creditCards, expenses, incomes, investments });
  const availableAfterPlan = salary - plan.total;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">Set this money aside when salary arrives. Transfers are suggestions until you confirm them with your bank.</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-y border-border py-5">
          <div><p className="text-xs text-muted">Total to reserve</p><p className="mt-1 text-3xl font-bold">{formatMoney(plan.total, currency)}</p></div>
          <div className="text-right"><p className="text-xs text-muted">From salary {formatMoney(salary, currency)}</p><p className={availableAfterPlan >= 0 ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{formatMoney(Math.abs(availableAfterPlan), currency)} {availableAfterPlan >= 0 ? "left after reserves" : "shortfall"}</p></div>
        </div>
      </div>

      {plan.transfers.map((transfer) => (
        <section key={transfer.accountId ?? "unassigned"} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Transfer to {transfer.accountName}</h2></div>
            <p className="text-lg font-bold">{formatMoney(transfer.amount, currency)}</p>
          </div>
          <Progress value={salary > 0 ? (transfer.amount / salary) * 100 : 0} />
          <Card className="divide-y divide-border p-4 shadow-none">
            {transfer.items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.label}</p><p className="text-xs text-muted">{item.timing}</p></div>
                  <p className="text-sm font-semibold">{formatMoney(item.amount, currency)}</p>
                </div>
              );
            })}
          </Card>
        </section>
      ))}

      <div className="rounded-xl border border-warning/35 bg-warning/10 p-4 text-xs leading-relaxed text-muted">
        PG electricity is an estimate based on June ₹1,180 and July ₹650. Update the bill when the next amount is known. Credit-card reserves use transactions in each card&apos;s current statement cycle.
      </div>
    </div>
  );
}