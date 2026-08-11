"use client";

import { CategoryIcon, getCategoryColor } from "@/components/category-icon";
import { AmountInput } from "@/components/ui/amount-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { billCycle, billOccurrenceDate, monthlyBillReserve } from "@/lib/bill-cycle";
import { CATEGORIES } from "@/lib/constants";
import { billSchema } from "@/lib/schemas";
import { useFinanceStore } from "@/lib/store";
import type { Bill, BillFrequency } from "@/lib/types";
import {
  currencySymbol,
  dateInputToIso,
  formatMoney,
  localDateInputValue,
  parseFinancialDate,
} from "@/lib/utils";
import { CalendarClock, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export function BillsView() {
  const bills = useFinanceStore((s) => s.bills);
  const expenses = useFinanceStore((s) => s.expenses);
  const currency = useFinanceStore((s) => s.profile.currency);
  const storedCustomCategories = useFinanceStore((s) => s.profile.customCategories);
  const customCategories = storedCustomCategories ?? [];
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
    amount: "",
    dueDate: localDateInputValue(),
    category: "Utilities" as Bill["category"],
    accountId: "",
    frequency: "monthly" as BillFrequency,
    intervalDays: "90",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

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
      amount: "",
      dueDate: localDateInputValue(),
      category: "Utilities",
      accountId: defaultAccount?.id ?? "",
      frequency: "monthly",
      intervalDays: "90",
    });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      dueDate: bill.dueDate
        ? localDateInputValue(parseFinancialDate(bill.dueDate))
        : localDateInputValue(billOccurrenceDate(bill)),
      category: bill.category,
      accountId: bill.accountId ?? "",
      frequency: bill.frequency,
      intervalDays: String(bill.intervalDays ?? 90),
    });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    const parsed = billSchema.safeParse({
      name: form.name,
      amount: form.amount,
      // Only validated when it is the field actually driving the schedule.
      intervalDays: form.frequency === "interval" ? form.intervalDays : undefined,
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }

    setErrors({});
    const selectedDate = parseFinancialDate(form.dueDate);
    const existing = editingId ? bills.find((bill) => bill.id === editingId) : undefined;
    const bill = {
      name: parsed.data.name,
      amount: parsed.data.amount,
      dueDay: selectedDate.getDate(),
      dueDate: dateInputToIso(form.dueDate),
      frequency: form.frequency,
      intervalDays: parsed.data.intervalDays,
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
            const categoryColor = getCategoryColor(b.category, customCategories);
            const cycle = billCycle(b, expenses);
            const account = accounts.find((item) => item.id === b.accountId);
            const isFutureYear = cycle.occurrenceDate.getFullYear() > new Date().getFullYear();
            const dateLabel = cycle.occurrenceDate.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: isFutureYear ? "numeric" : undefined,
            });
            const isFutureInterval =
              b.frequency === "interval" && !cycle.isDueThisMonth && !cycle.overdue;
            const isScheduled = isFutureInterval || isFutureYear;
            return (
              <Card key={b.id} className="flex items-center gap-3 p-4">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${categoryColor} 15%, transparent)`,
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
                    ) : isFutureYear ? (
                      <Badge color="var(--primary)">Scheduled</Badge>
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
                    {!cycle.isPaid && !isScheduled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void markPaid(b)}
                        className="h-8 w-8 text-muted hover:bg-success/10 hover:text-success"
                        aria-label={`Mark ${b.name} paid`}
                        title="Mark paid"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(b)}
                      className="h-8 w-8 text-muted"
                      aria-label={`Edit ${b.name}`}
                      title="Edit bill"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBill(b.id)}
                      className="h-8 w-8 text-danger hover:bg-danger/10"
                      aria-label={`Move ${b.name} to recycle bin`}
                      title="Move to recycle bin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <Label htmlFor="bill-name">Bill name</Label>
            <Input
              id="bill-name"
              autoFocus
              placeholder="e.g. Electricity"
              value={form.name}
              aria-invalid={Boolean(errors.name) || undefined}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bill-amount">Amount</Label>
              <AmountInput
                id="bill-amount"
                prefix={currencySymbol(currency)}
                value={form.amount}
                invalid={Boolean(errors.amount)}
                onChange={(amount) => setForm({ ...form, amount })}
              />
              {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount}</p>}
            </div>
            <div>
              <Label htmlFor="bill-date">Date</Label>
              <Input
                id="bill-date"
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
              <Label htmlFor="bill-frequency">Repeats</Label>
              <Select
                id="bill-frequency"
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
                <Label htmlFor="bill-interval">Every</Label>
                <div className="flex items-center gap-2">
                  <AmountInput
                    id="bill-interval"
                    decimals={0}
                    value={form.intervalDays}
                    invalid={Boolean(errors.intervalDays)}
                    onChange={(intervalDays) => setForm({ ...form, intervalDays })}
                  />
                  <span className="text-sm text-muted">days</span>
                </div>
                {errors.intervalDays && (
                  <p className="mt-1 text-xs text-danger">{errors.intervalDays}</p>
                )}
              </div>
            )}
          </div>
          <div>
            <Label>Category</Label>
            <Combobox
              options={[
                ...CATEGORIES.map((category) => ({
                  label: category,
                  value: category,
                  icon: <CategoryIcon category={category} />,
                })),
                ...customCategories.map((category) => ({
                  label: category.name,
                  value: category.name,
                  icon: <CategoryIcon category={category.name} />,
                })),
              ]}
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value as Bill["category"] })}
              ariaLabel="Bill category"
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
          <ModalFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>{editingId ? "Save changes" : "Add bill"}</Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
