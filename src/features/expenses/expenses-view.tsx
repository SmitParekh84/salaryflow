"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { CATEGORIES, CATEGORY_META } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { formatMoney, newestFirst } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { SeedPrompt, TransactionList } from "./transaction-list";
import { Plus, Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";

export function ExpensesView() {
  const expenses = useFinanceStore((s) => s.expenses);
  const currency = useFinanceStore((s) => s.profile.currency);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return newestFirst(expenses)
      .filter((e) => (cat === "all" ? true : e.category === cat))
      .filter((e) =>
        !term
          ? true
          : e.merchant?.toLowerCase().includes(term) ||
            e.category.toLowerCase().includes(term) ||
            e.note?.toLowerCase().includes(term) ||
            e.shared?.friendName.toLowerCase().includes(term) ||
            String(e.amount).includes(term)
      );
  }, [expenses, q, cat]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const openEdit = (e: Expense) => {
    setEditing(e);
    setAddOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {filtered.length} transactions · {formatMoney(total, currency)}
          </p>
        </div>
        <div className="flex gap-2">
          {expenses.length === 0 && <SeedPrompt />}
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search transactions…"
            className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
          />
        </div>
        <Select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="max-w-[180px]"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_META[c].emoji} {c}
            </option>
          ))}
        </Select>
      </div>

      <Card className="p-5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions found"
            description="Try adjusting your filters or add a new expense."
          />
        ) : (
          <TransactionList
            expenses={filtered}
            currency={currency}
            onEdit={openEdit}
          />
        )}
      </Card>

      <ExpenseForm
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
