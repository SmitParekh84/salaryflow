"use client";

import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { billCycle, billOccurrenceDate, monthlyBillReserve } from "@/lib/bill-cycle";
import { CATEGORIES, CATEGORY_META } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { Bill, BillFrequency } from "@/lib/types";
import { dateInputToIso, formatMoney, localDateInputValue, parseFinancialDate } from "@/lib/utils";
import { CalendarClock, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export function BillsView() {
  const bills = useFinanceStore((s) => s.bills);
  const expenses = useFinanceStore((s) => s.expenses);
  const currency = useFinanceStore((s) => s.profile.currency);
  const deleteBill = useFinanceStore((s) => s.deleteBill);
  const addBill = useFinanceStore((s) => s.addBill);
  const updateBill = useFinanceStore((s) => s.updateBill);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const accounts = useFinanceStore((s) => s.accounts);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    amount: 0,
    dueDate: localDateInputValue(),
    category: "Utilities" as Bill["category"],
    accountId: "",
    frequency: "monthly" as BillFrequency,
    intervalDays: 90,
  });

  const sorted = useMemo(() => {
    return [...bills].sort((first, second) => {
      const firstCycle = billCycle(first, expenses);
      const secondCycle = billCycle(second, expenses);
      if (firstCycle.isPaid !== secondCycle.isPaid) return firstCycle.isPaid ? 1 : -1;
      return firstCycle.occurrenceDate.getTime() - secondCycle.occurrenceDate.getTime();
    });
  }, [bills, expenses]);

  const totalDue = bills.reduce((sum, bill) => {
    const cycle = billCycle(bill, expenses);
    return cycle.isDueThisMonth || cycle.overdue ? sum + cycle.remainingAmount : sum;
  }, 0);

  const openAdd = () => {
    const defaultAccount = accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("subscriptions"),
    );
    setEditingId(null);
    setForm({
      name: "",
      amount: 0,
      dueDate: localDateInputValue(),
      category: "Utilities",
      accountId: defaultAccount?.id ?? "",
      frequency: "monthly",
      intervalDays: 90,
    });
    setOpen(true);
  };

  const openEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setForm({
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate
        ? localDateInputValue(parseFinancialDate(bill.dueDate))
        : localDateInputValue(billOccurrenceDate(bill)),
      category: bill.category,
      accountId: bill.accountId ?? "",
      frequency: bill.frequency,
      intervalDays: bill.intervalDays ?? 90,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || form.amount <= 0) return;
    const selectedDate = parseFinancialDate(form.dueDate);
    const existing = editingId ? bills.find((bill) => bill.id === editingId) : undefined;
    const bill = {
      name: form.name.trim(),
      amount: form.amount,
      dueDay: selectedDate.getDate(),
      dueDate: dateInputToIso(form.dueDate),
      frequency: form.frequency,
      intervalDays: form.frequency === "interval" ? form.intervalDays : undefined,
      category: form.category,
      paid: existing?.paid ?? false,
      accountId: form.accountId || undefined,
    };
    if (editingId) updateBill(editingId, bill);
    else addBill(bill);
    setOpen(false);
    await syncWithServer();
  };

  const markPaid = async (bill: Bill) => {
    const cycle = billCycle(bill, expenses);
    if (cycle.isPaid) return;
    const account = accounts.find((candidate) => candidate.id === bill.accountId);
    addExpense({
      amount: cycle.remainingAmount,
      category: bill.category,
      merchant: bill.name,
      paymentMethod: "UPI",
      note: `${cycle.billedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })} bill${account ? ` · Paid from ${account.bankName}` : ""}`,
      date: new Date().toISOString(),
      recurring: false,
      accountId: bill.accountId,
      billId: bill.id,
      billingMonth: cycle.billingMonth,
    });
    await syncWithServer();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{formatMoney(totalDue, currency)} due this cycle</p>
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
            const cycle = billCycle(b, expenses);
            const account = accounts.find((item) => item.id === b.accountId);
            const dateLabel = cycle.occurrenceDate.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
            const isFutureInterval =
              b.frequency === "interval" && !cycle.isDueThisMonth && !cycle.overdue;
            return (
              <Card key={b.id} className="flex items-center gap-3 p-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                  }}
                >
                  <CategoryIcon category={b.category} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted">
                      {b.category === "Utilities"
                        ? `${cycle.billedMonth.toLocaleDateString("en-US", { month: "long" })} bill · ${dateLabel}`
                        : b.frequency === "interval"
                          ? `Every ${b.intervalDays ?? 90} days · next ${dateLabel}`
                        : dateLabel}
                      {account ? ` · ${account.bankName}` : ""}
                    </span>
                    {isFutureInterval ? (
                      <Badge color="var(--primary)">Saving</Badge>
                    ) : cycle.isPaid ? (
                      <Badge color="var(--success)">Paid</Badge>
                    ) : cycle.overdue ? (
                      <Badge color="var(--danger)">Overdue</Badge>
                    ) : (
                      <Badge color="var(--warning)">Pending</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatMoney(cycle.amount, currency)}</p>
                  {b.frequency === "interval" && (
                    <p className="text-xs text-muted">
                      {formatMoney(monthlyBillReserve(b), currency)} per salary cycle
                    </p>
                  )}
                  {cycle.recordedAmount > 0 && !cycle.isPaid && (
                    <p className="text-xs text-muted">
                      {formatMoney(cycle.remainingAmount, currency)} remaining
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-end gap-1">
                    {!cycle.isPaid && !isFutureInterval && (
                      <button
                        onClick={() => void markPaid(b)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-success/10 hover:text-success"
                        aria-label={`Mark ${b.name} paid`}
                        title="Mark paid"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(b)}
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      aria-label={`Edit ${b.name}`}
                      title="Edit bill"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteBill(b.id)}
                      className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
                      aria-label={`Move ${b.name} to recycle bin`}
                      title="Move to recycle bin"
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit bill" : "Add bill"}
      >
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
              <Label>Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted">
                {form.frequency === "interval"
                  ? "This is the next payment date."
                  : "The recurrence follows this date."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Repeats</Label>
              <Select
                value={form.frequency}
                onChange={(event) =>
                  setForm({ ...form, frequency: event.target.value as BillFrequency })
                }
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
                <option value="interval">Custom interval</option>
              </Select>
            </div>
            {form.frequency === "interval" && (
              <div>
                <Label>Every</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={form.intervalDays}
                    onChange={(event) =>
                      setForm({ ...form, intervalDays: Number(event.target.value) })
                    }
                  />
                  <span className="text-sm text-muted">days</span>
                </div>
              </div>
            )}
          </div>
          <div>
            <Label>Category</Label>
            <Combobox
              options={CATEGORIES.map((category) => ({ label: category, value: category }))}
              value={form.category}
              onValueChange={(value) =>
                setForm({ ...form, category: value as Bill["category"] })
              }
              searchPlaceholder="Search categories..."
            />
          </div>
          {accounts.length > 0 && (
            <div>
              <Label>Paid from</Label>
              <Select
                value={form.accountId}
                onChange={(event) => setForm({ ...form, accountId: event.target.value })}
              >
                <option value="">No account selected</option>
                {accounts
                  .filter((account) => account.status === "active")
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName}
                    </option>
                  ))}
              </Select>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void save()}>
              {editingId ? "Save changes" : "Add bill"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
