"use client";

import { CategoryIcon, getCategoryColor } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Pencil, Trash2, Users } from "lucide-react";

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
  const accounts = useFinanceStore((s) => s.accounts);
  const creditCards = useFinanceStore((s) => s.creditCards);
  const storedCustomCategories = useFinanceStore((s) => s.profile.customCategories);
  const customCategories = storedCustomCategories ?? [];

  return (
    <div className="divide-y divide-border">
      <AnimatePresence initial={false}>
        {expenses.map((e) => {
          const categoryColor = getCategoryColor(e.category, customCategories);
          const account = accounts.find((item) => item.id === e.accountId);
          const creditCard = creditCards.find((item) => item.id === e.accountId);
          const sourceName = account?.bankName ?? creditCard?.name;
          const note = e.note?.trim();
          const showNote = note && note.toLowerCase() !== sourceName?.toLowerCase();
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
                  backgroundColor: `color-mix(in srgb, ${categoryColor} 15%, transparent)`,
                }}
              >
                <CategoryIcon category={e.category} className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.merchant || e.category}</p>
                <p className="truncate text-xs text-muted">
                  {e.category} · {e.paymentMethod}
                  {sourceName ? ` · ${sourceName}` : ""}
                  {showNote ? ` · ${note}` : ""}
                </p>
                {e.shared && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                    <Users className="h-3 w-3" />
                    You {formatMoney(e.shared.userPaid, currency)} · {e.shared.friendName}{" "}
                    {formatMoney(e.shared.friendPaid, currency)} · Total{" "}
                    {formatMoney(e.shared.totalAmount, currency)}
                  </p>
                )}
              </div>

              {!compact && (
                <div className="hidden items-center gap-1 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorite(e.id)}
                    className="h-8 w-8"
                    aria-label="Favorite"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        e.favorite ? "fill-danger text-danger" : "text-muted",
                      )}
                    />
                  </Button>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(e)}
                      className="h-8 w-8"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4 text-muted" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteExpense(e.id)}
                    className="h-8 w-8 text-danger hover:bg-danger/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="text-right">
                <p className="text-sm font-semibold">−{formatMoney(e.amount, currency)}</p>
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
