"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { upcomingBills } from "@/lib/calculations";
import { CATEGORIES, CATEGORY_META } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { Bill } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { CalendarClock, Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export function BillsView() {
  const bills = useFinanceStore((s) => s.bills);
  const currency = useFinanceStore((s) => s.profile.currency);
  const toggleBillPaid = useFinanceStore((s) => s.toggleBillPaid);
  const deleteBill = useFinanceStore((s) => s.deleteBill);
  const addBill = useFinanceStore((s) => s.addBill);
  const accounts = useFinanceStore((s) => s.accounts);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    amount: 0,
    dueDay: 1,
    category: "Utilities" as Bill["category"],
    accountId: "",
  });

  const sorted = useMemo(() => {
    const pending = upcomingBills(bills);
    const paid = bills.filter((b) => b.paid);
    return [...pending, ...paid];
  }, [bills]);

  const totalDue = bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const day = new Date().getDate();

  const openAdd = () => {
    const defaultAccount = accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("subscriptions"),
    );
    setForm((current) => ({ ...current, accountId: defaultAccount?.id ?? "" }));
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || form.amount <= 0) return;
    addBill({
      name: form.name,
      amount: form.amount,
      dueDay: form.dueDay,
      frequency: "monthly",
      category: form.category,
      paid: false,
      accountId: form.accountId || undefined,
    });
    setForm({ name: "", amount: 0, dueDay: 1, category: "Utilities", accountId: "" });
    setOpen(false);
    await syncWithServer();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {formatMoney(totalDue, currency)} due this cycle
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add bill
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No bills yet"
          description="Track recurring bills like rent, internet and subscriptions."
          action={
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add bill
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sorted.map((b) => {
            const meta = CATEGORY_META[b.category];
            const overdue = !b.paid && b.dueDay < day;
            const account = accounts.find((item) => item.id === b.accountId);
            return (
              <Card key={b.id} className="flex items-center gap-3 p-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                  }}
                >
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted">Due {b.dueDay}th{account ? ` · ${account.bankName}` : ""}</span>
                    {b.paid ? (
                      <Badge color="var(--success)">Paid</Badge>
                    ) : overdue ? (
                      <Badge color="var(--danger)">Overdue</Badge>
                    ) : (
                      <Badge color="var(--warning)">Pending</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {formatMoney(b.amount, currency)}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleBillPaid(b.id)}
                      className={cn(
                        "rounded-lg p-1.5 transition-colors",
                        b.paid
                          ? "text-success hover:bg-success/10"
                          : "text-muted hover:bg-surface-2"
                      )}
                      aria-label="Toggle paid"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteBill(b.id)}
                      className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add bill">
        <div className="space-y-4">
          <div>
            <Label>Bill name</Label>
            <Input
              autoFocus
              placeholder="e.g. Electricity"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Due day</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dueDay: Math.max(1, Math.min(31, Number(e.target.value))),
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as Bill["category"] })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].emoji} {c}
                </option>
              ))}
            </Select>
          </div>
          {accounts.length > 0 && (
            <div>
              <Label>Paid from</Label>
              <Select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>
                <option value="">No account selected</option>
                {accounts.filter((account) => account.status === "active").map((account) => (
                  <option key={account.id} value={account.id}>{account.bankName}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void save()}>
              Add bill
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
