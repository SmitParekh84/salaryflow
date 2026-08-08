"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useFinanceStore } from "@/lib/store";
import type { RecycleEntityType } from "@/lib/types";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { useState } from "react";

const ENTITY_LABELS: Record<RecycleEntityType, string> = {
  expense: "Expense",
  income: "Income",
  bill: "Bill",
  goal: "Goal",
  investment: "Investment",
  account: "Bank account",
  "credit-card": "Credit card",
  "budget-rule": "Budget rule",
  "salary-history": "Salary entry",
};

export function RecycleBinView() {
  const items = useFinanceStore((state) => state.recycleBin);
  const restoreItem = useFinanceStore((state) => state.restoreRecycleItem);
  const permanentlyDeleteItem = useFinanceStore((state) => state.permanentlyDeleteRecycleItem);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function restore(id: string) {
    setBusyId(id);
    await restoreItem(id);
    setBusyId(null);
  }

  async function permanentlyDelete(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setBusyId(id);
    await permanentlyDeleteItem(id);
    setBusyId(null);
    setConfirmId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm font-medium">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Deleted records stay here until you restore them or remove them permanently.
          </p>
        </div>
        {confirmId && (
          <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>
            Cancel permanent delete
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Recycle bin is empty"
          description="Deleted expenses, bills, goals, accounts and other records will appear here."
        />
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {ENTITY_LABELS[item.entityType]} · Deleted{" "}
                  {new Date(item.deletedAt).toLocaleString("en-US", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void restore(item.id)}
                >
                  <ArchiveRestore className="h-4 w-4" /> Restore
                </Button>
                <Button
                  size="sm"
                  variant={confirmId === item.id ? "danger" : "secondary"}
                  disabled={busyId === item.id}
                  onClick={() => void permanentlyDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  {confirmId === item.id ? "Confirm delete" : "Delete forever"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
