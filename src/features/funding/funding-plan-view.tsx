"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { useSummary } from "@/hooks/use-summary";
import { buildFundingPlan, type FundingPlanItem } from "@/lib/funding-plan";
import { useFinanceStore } from "@/lib/store";
import { formatMoney, localDateInputValue, newestFirst } from "@/lib/utils";
import { Check, CreditCard, Landmark, PiggyBank, Plus, Receipt, TrendingUp } from "lucide-react";
import { useState } from "react";

const KIND_ICON = {
  "credit-card": CreditCard,
  investment: TrendingUp,
  savings: PiggyBank,
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
  const activeBudgetRule = useFinanceStore((state) =>
    state.budgetRules.find((rule) => rule.active),
  );
  const summary = useSummary();
  const currency = profile.currency;
  const addExpense = useFinanceStore((state) => state.addExpense);
  const syncWithServer = useFinanceStore((state) => state.syncWithServer);
  const [payingItem, setPayingItem] = useState<FundingPlanItem | null>(null);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentRows, setPaymentRows] = useState([
    { month: localDateInputValue().slice(0, 7), amount: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const confirmedSalary = newestFirst(
    salaryHistory.filter((entry): entry is typeof entry & { date: string } =>
      Boolean(entry.confirmed && entry.date),
    ),
  )[0]?.amount;
  const salary = summary.salaryIncome || confirmedSalary || profile.amount;
  const plan = buildFundingPlan({
    accounts,
    bills,
    creditCards,
    expenses,
    incomes,
    investments,
    budgetRule: activeBudgetRule,
    monthlyIncome: salary,
    savedThisCycle: summary.savedThisCycle,
  });
  const availableAfterPlan = salary - plan.total;

  function openPayment(item: FundingPlanItem) {
    if (!item.billId) return;
    setPayingItem(item);
    setPaymentAccountId(item.destinationAccountId ?? "");
    setPaymentRows([
      {
        month: item.billingMonth ?? localDateInputValue().slice(0, 7),
        amount: item.remainingAmount || item.amount,
      },
    ]);
  }

  async function savePayments() {
    if (!payingItem?.billId || !paymentAccountId) return;
    setSaving(true);
    const account = accounts.find((candidate) => candidate.id === paymentAccountId);
    for (const row of paymentRows) {
      if (!row.month || row.amount <= 0) continue;
      const duplicate = expenses.some(
        (expense) =>
          expense.billId === payingItem.billId &&
          expense.billingMonth === row.month &&
          expense.amount === row.amount,
      );
      if (duplicate) continue;
      const [year, month] = row.month.split("-").map(Number);
      addExpense({
        amount: row.amount,
        category:
          payingItem.kind === "rent"
            ? "Rent"
            : payingItem.kind === "investment"
              ? "Investment"
              : payingItem.kind === "utility"
                ? "Utilities"
                : payingItem.kind === "subscription"
                  ? "Subscriptions"
                  : "Other",
        merchant: payingItem.label,
        paymentMethod: "UPI",
        note: `${new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })} payment${account ? ` · Paid from ${account.bankName}` : ""}`,
        date: new Date().toISOString(),
        recurring: false,
        accountId: paymentAccountId,
        billId: payingItem.billId,
        billingMonth: row.month,
      });
    }
    await syncWithServer();
    setSaving(false);
    setPayingItem(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">
          Set this money aside when salary arrives. Transfers are suggestions until you confirm them
          with your bank.
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-y border-border py-5">
          <div>
            <p className="text-xs text-muted">Still to set aside</p>
            <p className="mt-1 text-3xl font-bold">{formatMoney(plan.total, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">
              Planned {formatMoney(plan.plannedTotal, currency)} · Paid{" "}
              {formatMoney(plan.paidTotal, currency)}
            </p>
            <p
              className={
                availableAfterPlan >= 0
                  ? "text-sm font-semibold text-success"
                  : "text-sm font-semibold text-danger"
              }
            >
              {formatMoney(Math.abs(availableAfterPlan), currency)}{" "}
              {availableAfterPlan >= 0 ? "left after reserves" : "shortfall"}
            </p>
          </div>
        </div>
      </div>

      {plan.transfers.map((transfer) => (
        <section key={transfer.accountId ?? "unassigned"} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                {transfer.amount > 0 ? "Transfer to" : "Paid from"} {transfer.accountName}
              </h2>
            </div>
            <p className="text-lg font-bold">
              {transfer.amount > 0 ? formatMoney(transfer.amount, currency) : "Nothing due"}
            </p>
          </div>
          {transfer.amount > 0 && (
            <div>
              <Progress
                value={plan.total > 0 ? (transfer.amount / plan.total) * 100 : 0}
                label={`${transfer.accountName} share of amount still to set aside`}
                valueText={`${formatMoney(transfer.amount, currency)} of ${formatMoney(plan.total, currency)}`}
              />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                <span>Share of remaining plan</span>
                <span>{Math.round((transfer.amount / Math.max(1, plan.total)) * 100)}%</span>
              </div>
            </div>
          )}
          <Card className="divide-y divide-border p-4 shadow-none">
            {transfer.items.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted">{item.timing}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatMoney(item.amount, currency)}</p>
                    {item.billId && item.remainingAmount === 0 ? (
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-success">
                        <Check className="h-3 w-3" /> Paid
                      </p>
                    ) : item.billId ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-1 h-7 px-2 text-xs"
                        onClick={() => openPayment(item)}
                      >
                        Mark paid
                      </Button>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted">Reserve</p>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      ))}

      <div className="rounded-xl border border-warning/35 bg-warning/10 p-4 text-xs leading-relaxed text-muted">
        Electricity is tracked one month behind: August usage appears in September&apos;s plan.
        Until the actual amount is known, the estimate uses recent bills. Credit-card reserves use
        transactions in each card&apos;s current statement cycle.
      </div>

      <Modal
        open={Boolean(payingItem)}
        onClose={() => setPayingItem(null)}
        title={payingItem ? `Pay ${payingItem.label}` : "Record payment"}
      >
        <div className="space-y-4">
          <div>
            <Label>Paid from</Label>
            <Select
              value={paymentAccountId}
              onChange={(event) => setPaymentAccountId(event.target.value)}
            >
              <option value="">Select account</option>
              {accounts
                .filter((account) => account.status === "active")
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName}
                  </option>
                ))}
            </Select>
          </div>
          <div className="space-y-3">
            {paymentRows.map((row, index) => (
              <div key={`${index}-${row.month}`} className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bill month</Label>
                  <Input
                    type="month"
                    value={row.month}
                    onChange={(event) =>
                      setPaymentRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, month: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Amount paid</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.amount || ""}
                    onChange={(event) =>
                      setPaymentRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, amount: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          {payingItem?.kind === "utility" && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPaymentRows((current) => [...current, { month: "", amount: 0 }])}
            >
              <Plus className="h-4 w-4" /> Add another month
            </Button>
          )}
          <p className="text-xs text-muted">
            Saving creates the matching expense and updates this month&apos;s plan. Your account
            balance is not changed automatically.
          </p>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setPayingItem(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !paymentAccountId}
              onClick={() => void savePayments()}
            >
              {saving ? "Saving…" : "Save payment"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
