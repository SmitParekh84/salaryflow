"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { TransactionList } from "@/features/expenses/transaction-list";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { formatMoney, localDateInputValue, newestFirst, parseFinancialDate } from "@/lib/utils";
import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";

export function SharedSpendingView() {
  const expenses = useFinanceStore((state) => state.expenses);
  const currency = useFinanceStore((state) => state.profile.currency);
  const [month, setMonth] = useState(localDateInputValue().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const sharedExpenses = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    // Narrowed before sorting, not after. One month of shared expenses is a
    // handful of rows; sorting the whole history first to reach them meant
    // re-sorting everything each time the month picker moved.
    return newestFirst(
      expenses.filter((expense) => {
        if (!expense.shared) return false;
        const date = parseFinancialDate(expense.date);
        return date.getFullYear() === year && date.getMonth() + 1 === monthNumber;
      }),
    );
  }, [expenses, month]);

  const totals = sharedExpenses.reduce(
    (result, expense) => ({
      total: result.total + (expense.shared?.totalAmount ?? expense.amount),
      mine: result.mine + expense.amount,
      friends: result.friends + (expense.shared?.friendPaid ?? 0),
    }),
    { total: 0, mine: 0, friends: 0 },
  );

  const people = Array.from(
    sharedExpenses.reduce((map, expense) => {
      const name = expense.shared!.friendName;
      const current = map.get(name) ?? { mine: 0, theirs: 0, outings: 0 };
      map.set(name, {
        mine: current.mine + expense.amount,
        theirs: current.theirs + expense.shared!.friendPaid,
        outings: current.outings + 1,
      });
      return map;
    }, new Map<string, { mine: number; theirs: number; outings: number }>()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="h-10 w-auto"
          aria-label="Shared spending month"
        />
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add shared expense
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted">Group total</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(totals.total, currency)}</p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted">You paid</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(totals.mine, currency)}</p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs text-muted">Friends paid</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(totals.friends, currency)}</p>
        </Card>
      </div>

      {people.length > 0 && (
        <div className="divide-y divide-border border-y border-border">
          {people.map(([name, contribution]) => (
            <div key={name} className="flex items-center gap-3 py-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{name}</p>
                <p className="text-xs text-muted">
                  {contribution.outings} shared{" "}
                  {contribution.outings === 1 ? "expense" : "expenses"}
                </p>
              </div>
              <p className="text-right text-xs text-muted">
                You {formatMoney(contribution.mine, currency)}
                <br />
                {name} {formatMoney(contribution.theirs, currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Card className="p-5">
        {sharedExpenses.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No shared spending this month"
            description="Record an outing to track what you and your friend each paid."
            action={
              <Button size="sm" onClick={() => setOpen(true)}>
                Add shared expense
              </Button>
            }
          />
        ) : (
          <TransactionList
            expenses={sharedExpenses}
            currency={currency}
            onEdit={(expense) => {
              setEditing(expense);
              setOpen(true);
            }}
          />
        )}
      </Card>

      <ExpenseForm
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        editing={editing}
        sharedMode
      />
    </div>
  );
}
