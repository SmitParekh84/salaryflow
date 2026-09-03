"use client";

import { CategoryIcon, getCategoryColor } from "@/components/category-icon";
import { MerchantIcon } from "@/components/merchant-icon";
import { AmountInput } from "@/components/ui/amount-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { fundingAccount } from "@/lib/account-references";
import { billCycle, billOccurrenceDate, monthlyBillReserve } from "@/lib/bill-cycle";
import { CATEGORIES } from "@/lib/constants";
import { billSchema } from "@/lib/schemas";
import { useFinanceStore } from "@/lib/store";
import type { Bill, BillFrequency } from "@/lib/types";
import {
  currencySymbol,
  dateInputToIso,
  formatDate,
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
  /** Bill id -> why its "mark paid" could not be recorded. */
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  /**
   * The bill waiting to be told which account pays it. Marking an unlinked bill
   * paid used to record the expense and move no balance at all, silently.
   */
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [payFromId, setPayFromId] = useState("");

  const activeAccounts = accounts.filter((account) => account.status === "active");

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

  /**
   * Paying an unlinked bill cannot move a balance, so ask which account pays it
   * instead of recording a payment that quietly changes nothing. Skipped when
   * there is no active account to offer — then "no balance moved" is the truth,
   * not a mistake.
   */
  const startPayment = (bill: Bill) => {
    const funding = fundingAccount(bill.accountId, accounts);
    if (funding.status === "linked" || activeAccounts.length === 0) {
      void markPaid(bill);
      return;
    }

    const preferred = activeAccounts.find((account) =>
      account.defaultFor?.includes("subscriptions"),
    );
    setPayFromId(preferred?.id ?? activeAccounts[0].id);
    setPayingBill(bill);
  };

  const confirmPayment = async () => {
    if (!payingBill || !payFromId) return;
    const bill = { ...payingBill, accountId: payFromId };
    // Remember the choice: the next cycle of this bill pays from here too.
    updateBill(payingBill.id, { accountId: payFromId });
    setPayingBill(null);
    await markPaid(bill);
  };

  const markPaid = async (bill: Bill) => {
    const cycle = billCycle(bill, expenses);
    if (cycle.isPaid) return;
    const account = accounts.find((candidate) => candidate.id === bill.accountId);
    const recorded = addExpense({
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
    // Paying a bill now moves the linked account's balance, so it can be
    // refused. Without this the button looked like it worked and the bill
    // quietly stayed unpaid.
    if (!recorded) {
      setPaymentErrors((current) => ({
        ...current,
        [bill.id]: `${account?.bankName ?? "That account"} only has ${formatMoney(account?.balance ?? 0, currency)}.`,
      }));
      return;
    }
    setPaymentErrors((current) => {
      if (!current[bill.id]) return current;
      const rest = { ...current };
      delete rest[bill.id];
      return rest;
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
            const funding = fundingAccount(b.accountId, accounts);
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
                {/* A bill's name is its merchant — "Netflix", "Airtel Fiber" —
                    so it gets the same brand mark the expense lists use. */}
                <MerchantIcon
                  merchant={b.name}
                  category={b.category}
                  categoryColor={categoryColor}
                  size={20}
                  chipClassName="h-11 w-11 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                    <span className="truncate">{b.name}</span>
                    {/* A stored maturity date had no way of being seen: the
                        model keeps it and the seed writes it, but nothing read
                        it, so a term policy's end date was invisible on the one
                        page about that policy. It still does not stop the bill
                        recurring — that needs a product decision, recorded in
                        SUGGESTIONS.md §6. */}
                    {b.maturityDate && (
                      <span className="shrink-0 text-[11px] font-normal text-muted">
                        matures {formatDate(b.maturityDate)}
                      </span>
                    )}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted">
                      {b.category === "Utilities"
                        ? `${cycle.billedMonth.toLocaleDateString("en-US", { month: "long" })} bill · ${dateLabel}`
                        : b.frequency === "interval"
                          ? `Every ${b.intervalDays ?? 90} days · next ${dateLabel}`
                          : dateLabel}
                      {funding.status === "linked" ? ` · ${funding.account.bankName}` : ""}
                    </span>
                    {funding.status !== "linked" && !cycle.isPaid && (
                      <span className="text-xs text-warning">
                        {funding.status === "missing"
                          ? "Account deleted — no balance will change"
                          : "No account — no balance will change"}
                      </span>
                    )}
                    {paymentErrors[b.id] && (
                      <span className="text-xs text-danger">{paymentErrors[b.id]}</span>
                    )}
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
                        onClick={() => startPayment(b)}
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

      <Modal
        open={payingBill !== null}
        onClose={() => setPayingBill(null)}
        title={payingBill ? `Pay ${payingBill.name}` : "Pay bill"}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            This bill is not linked to an account yet, so marking it paid would record the expense
            without changing any balance. Choose where the money comes from and it will be taken
            from that account — this time and every time after.
          </p>
          <div>
            <Label htmlFor="pay-from">Paid from</Label>
            <Select
              id="pay-from"
              value={payFromId}
              onChange={(event) => setPayFromId(event.target.value)}
            >
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} · {formatMoney(account.balance, currency)}
                </option>
              ))}
            </Select>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setPayingBill(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmPayment()}>
              {payingBill
                ? `Pay ${formatMoney(billCycle(payingBill, expenses).remainingAmount, currency)}`
                : "Pay"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
