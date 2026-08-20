"use client";

import { getCategoryColor } from "@/components/category-icon";
import { MerchantIcon } from "@/components/merchant-icon";
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
  dense = false,
}: {
  expenses: Expense[];
  currency: string;
  onEdit?: (e: Expense) => void;
  compact?: boolean;
  /**
   * For narrow columns — the dashboard runs two of these lists side by side in
   * a half-width card. The payment method and account name are the first things
   * to go: at ~220px they truncate to nothing useful anyway, and the category
   * alone still tells you what the row is.
   */
  dense?: boolean;
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
              role={onEdit ? "button" : undefined}
              tabIndex={onEdit ? 0 : undefined}
              onClick={onEdit ? () => onEdit(e) : undefined}
              onKeyDown={
                onEdit
                  ? (event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onEdit(e);
                      }
                    }
                  : undefined
              }
              className={cn(
                "group flex items-center gap-3",
                dense ? "py-2.5" : "py-3",
                onEdit &&
                  "cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-(--ring)",
              )}
            >
              <MerchantIcon
                merchant={e.merchant}
                category={e.category}
                categoryColor={categoryColor}
                size={dense ? 18 : 20}
                chipClassName={cn("rounded-xl", dense ? "h-9 w-9" : "h-10 w-10")}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm font-medium">
                  <span className="truncate">{e.merchant || e.category}</span>
                  {e.shared && dense && (
                    <Users className="h-3 w-3 shrink-0 text-primary" aria-label="Shared expense" />
                  )}
                </p>
                <p className={cn("truncate text-muted", dense ? "text-[11px]" : "text-xs")}>
                  {dense ? (
                    e.category
                  ) : (
                    <>
                      {e.category} · {e.paymentMethod}
                      {sourceName ? ` · ${sourceName}` : ""}
                      {showNote ? ` · ${note}` : ""}
                    </>
                  )}
                </p>
                {/* The split breakdown wraps to three lines in a narrow column,
                    which would make one row twice the height of its neighbours. */}
                {e.shared && !dense && (
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
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(e.id);
                    }}
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
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(e);
                      }}
                      className="h-8 w-8"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4 text-muted" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteExpense(e.id);
                    }}
                    className="h-8 w-8 text-danger hover:bg-danger/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/*
               * No per-row menu on a phone. The desktop actions above reveal on
               * hover, which no touch device has, so a phone needs another route
               * to them — but a dot-menu on every line of a list this dense is
               * mostly clutter. Tapping the row opens the editor, and Favourite
               * and Delete sit in its footer.
               */}
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
