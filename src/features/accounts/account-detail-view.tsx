"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { TransactionList } from "@/features/expenses/transaction-list";
import { creditCardUsage } from "@/lib/credit-cards";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { formatMoney, newestFirst } from "@/lib/utils";
import { CreditCard, Landmark, Receipt, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function AccountDetailView({ kind, id }: { kind: string; id: string }) {
  const router = useRouter();
  const accounts = useFinanceStore((state) => state.accounts);
  const creditCards = useFinanceStore((state) => state.creditCards);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const currency = useFinanceStore((state) => state.profile.currency);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);

  const account = kind === "bank" ? accounts.find((item) => item.id === id) : undefined;
  const creditCard = kind === "card" ? creditCards.find((item) => item.id === id) : undefined;
  const entity = account ?? creditCard;
  const entityExpenses = useMemo(
    () => newestFirst(expenses.filter((expense) => expense.accountId === id)),
    [expenses, id],
  );
  const filteredExpenses = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return entityExpenses;
    return entityExpenses.filter(
      (expense) =>
        expense.merchant?.toLowerCase().includes(term) ||
        expense.category.toLowerCase().includes(term) ||
        expense.note?.toLowerCase().includes(term) ||
        String(expense.amount).includes(term),
    );
  }, [entityExpenses, query]);

  if (!entity) {
    return (
      <EmptyState
        icon={Landmark}
        title="Account not found"
        description="This account may have been removed or is no longer available."
        action={
          <button className="text-sm font-medium text-primary" onClick={() => router.push("/accounts")}>
            Return to accounts
          </button>
        }
      />
    );
  }

  const totalSpent = entityExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const cardUsage = creditCard ? creditCardUsage(creditCard, expenses, incomes) : undefined;
  const EntityIcon = creditCard ? CreditCard : Landmark;
  const entityName = creditCard?.name ?? account?.bankName ?? "Account";
  const visibleTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface p-4 card-shadow sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <EntityIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold sm:text-xl">{entityName}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {creditCard ? `${creditCard.bankName} credit card` : `${account?.accountType} account`}
            </p>
          </div>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium capitalize text-muted">
            {entity.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 border-t border-border pt-4 sm:grid-cols-3">
          <div className="pr-4">
            <p className="text-xs text-muted">
              {creditCard ? "Current outstanding" : "Current balance"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
              {account?.maskBalance
                ? "••••••"
                : formatMoney(cardUsage?.outstanding ?? account?.balance ?? 0, currency)}
            </p>
          </div>
          <div className="border-l border-border px-4">
            <p className="text-xs text-muted">Recorded spending</p>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
              {formatMoney(totalSpent, currency)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {entityExpenses.length} {entityExpenses.length === 1 ? "transaction" : "transactions"}
            </p>
          </div>
          <div className="col-span-2 mt-4 border-t border-border pt-4 sm:col-span-1 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <p className="text-xs text-muted">
              {creditCard ? "Available credit" : "Account activity"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">
              {creditCard && cardUsage
                ? formatMoney(cardUsage.available, currency)
                : `${entityExpenses.length}`}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {creditCard
                ? `of ${formatMoney(creditCard.creditLimit, currency)} limit`
                : entityExpenses.length === 1
                  ? "recorded transaction"
                  : "recorded transactions"}
            </p>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden shadow-none">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-base font-semibold">Expenses</h2>
            <p className="mt-0.5 text-xs text-muted">
              {filteredExpenses.length} shown · {formatMoney(visibleTotal, currency)}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Search account expenses"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search expenses"
              className="bg-background pl-9"
            />
          </div>
        </div>
        <div className="px-4 sm:px-5">
          {filteredExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={query ? "No matching expenses" : "No expenses from this account"}
              description={
                query
                  ? "Try another merchant, category, note, or amount."
                  : "Expenses linked to this account will appear here."
              }
            />
          ) : (
            <TransactionList expenses={filteredExpenses} currency={currency} onEdit={setEditing} />
          )}
        </div>
      </Card>

      <ExpenseForm
        open={editing !== null}
        onClose={() => setEditing(null)}
        editing={editing}
      />
    </div>
  );
}