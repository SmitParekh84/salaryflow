"use client";

import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Pencil, Trash2 } from "lucide-react";

export function TransactionList({
  expenses,
  currency,
  onEdit,
  compact = false,
}: {
  expenses: Expense[];
  currency: string;
  onEdit?: (e: Expense) => void;
  compact?: boolean;
}) {
  const deleteExpense = useFinanceStore((s) => s.deleteExpense);
  const toggleFavorite = useFinanceStore((s) => s.toggleFavorite);

  return (
    <div className="divide-y divide-border">
      <AnimatePresence initial={false}>
        {expenses.map((e) => {
          const meta = CATEGORY_META[e.category];
          return (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="group flex items-center gap-3 py-3"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{
                  backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                }}
              >
                {meta.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {e.merchant || e.category}
                </p>
                <p className="truncate text-xs text-muted">
                  {e.category} · {e.paymentMethod}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>

              {!compact && (
                <div className="hidden items-center gap-1 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  <button
                    onClick={() => toggleFavorite(e.id)}
                    className="rounded-lg p-1.5 hover:bg-surface-2"
                    aria-label="Favorite"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        e.favorite ? "fill-danger text-danger" : "text-muted"
                      )}
                    />
                  </button>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(e)}
                      className="rounded-lg p-1.5 hover:bg-surface-2"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4 text-muted" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteExpense(e.id)}
                    className="rounded-lg p-1.5 hover:bg-surface-2"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </button>
                </div>
              )}

              <div className="text-right">
                <p className="text-sm font-semibold">
                  −{formatMoney(e.amount, currency)}
                </p>
                <p className="text-[11px] text-muted">
                  {new Date(e.date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function SeedPrompt() {
  const loadSeed = useFinanceStore((s) => s.loadSeed);
  return (
    <Button variant="secondary" size="sm" onClick={loadSeed}>
      Load demo data
    </Button>
  );
}
