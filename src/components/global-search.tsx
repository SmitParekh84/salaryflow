"use client";

import { CategoryIcon } from "@/components/category-icon";
import { useFinanceStore } from "@/lib/store";
import { formatDate, formatMoney, newestFirst } from "@/lib/utils";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Modal } from "./ui/modal";

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const expenses = useFinanceStore((s) => s.expenses);
  const currency = useFinanceStore((s) => s.profile.currency);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // toggled by parent via prop; dispatch a custom event
        window.dispatchEvent(new CustomEvent("open-search"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const sortedExpenses = newestFirst(expenses);
    if (!q.trim()) return sortedExpenses.slice(0, 6);
    const term = q.toLowerCase();
    return sortedExpenses
      .filter(
        (e) =>
          e.category.toLowerCase().includes(term) ||
          e.merchant?.toLowerCase().includes(term) ||
          e.note?.toLowerCase().includes(term) ||
          String(e.amount).includes(term),
      )
      .slice(0, 12);
  }, [q, expenses]);

  return (
    <Modal open={open} onClose={onClose} title="Search">
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3">
        <Search className="h-4 w-4 text-muted" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search expenses, merchants, categories…"
          className="h-11 flex-1 border-0 bg-transparent px-0 focus-visible:ring-0"
        />
      </div>
      <div className="space-y-1">
        {results.length === 0 && (
          <p className="py-8 text-center text-xs text-muted">No results found</p>
        )}
        {results.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2"
          >
            <CategoryIcon category={e.category} className="h-5 w-5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.merchant || e.category}</p>
              <p className="text-xs text-muted">
                {e.category} · {formatDate(e.date)}
              </p>
            </div>
            <p className="text-sm font-semibold">{formatMoney(e.amount, currency)}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
