"use client";

import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { SuggestInput } from "@/components/ui/suggest-input";
import { resolveRateSource, useFuelRate } from "@/features/fuel/use-fuel-rate";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { previousOdometer } from "@/lib/fuel";
import { EXPENSE_AMOUNT_MESSAGE, expenseAmountIsValid } from "@/lib/schemas";
import { optionalNumber } from "@/lib/schemas/primitives";
import { friendNameSuggestions, merchantSuggestions } from "@/lib/suggestions";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { dateInputToIso, localDateInputValue, parseFinancialDate } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const schema = z
  .object({
    amount: z.coerce.number(),
    category: z.string().min(1),
    merchant: z.string().optional(),
    paymentMethod: z.string().min(1),
    note: z.string().optional(),
    date: z.string().min(1),
    recurring: z.boolean().optional(),
    planNextPayment: z.boolean().optional(),
    recurrenceDays: z.coerce.number().int().min(1).max(3650).optional(),
    accountId: z.string().optional(),
    sharedEnabled: z.boolean().optional(),
    totalAmount: z.coerce.number().nonnegative().optional(),
    friendName: z.string().optional(),
    friendEmail: z.union([z.literal(""), z.string().email("Enter a valid email")]).optional(),
    friendPaid: z.coerce.number().nonnegative().optional(),
    inviteRequested: z.boolean().optional(),
    // `optionalNumber` rather than `z.coerce.number().optional()`: coercion
    // turns a cleared field into 0, which would record a fill at zero rupees a
    // litre instead of recording no rate at all.
    odometerKm: optionalNumber({ label: "odometer reading", min: 0, integer: true }),
    ratePerLitre: optionalNumber({ label: "rate per litre", min: 1 }),
  })
  .superRefine((values, context) => {
    if (!expenseAmountIsValid(values.amount, Boolean(values.sharedEnabled))) {
      context.addIssue({ code: "custom", path: ["amount"], message: EXPENSE_AMOUNT_MESSAGE });
    }
    // Litres are derived from the rate, so a reading with no rate cannot be
    // measured. Without a reading the entry is spending only and needs neither.
    if (values.category === "Fuel" && values.odometerKm != null && !values.ratePerLitre) {
      context.addIssue({
        code: "custom",
        path: ["ratePerLitre"],
        message: "Enter the rate per litre so mileage can be worked out",
      });
    }
    if (values.planNextPayment && !values.recurrenceDays) {
      context.addIssue({
        code: "custom",
        path: ["recurrenceDays"],
        message: "Enter the number of days until the next payment",
      });
    }
    if (!values.sharedEnabled) return;
    if (!values.friendName?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["friendName"],
        message: "Enter your friend's name",
      });
    }
    if (!values.totalAmount || values.totalAmount <= 0) {
      context.addIssue({ code: "custom", path: ["totalAmount"], message: "Enter the total bill" });
    }
    if (Math.abs(values.amount + (values.friendPaid ?? 0) - (values.totalAmount ?? 0)) > 0.01) {
      context.addIssue({
        code: "custom",
        path: ["friendPaid"],
        message: "Your payment and friend's payment must equal the total",
      });
    }
  });

type FormValues = z.input<typeof schema>;

export function ExpenseForm({
  open,
  onClose,
  editing,
  sharedMode = false,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Expense | null;
  sharedMode?: boolean;
}) {
  const storedCustomCategories = useFinanceStore((state) => state.profile.customCategories);
  const customCategories = storedCustomCategories ?? [];
  const addExpense = useFinanceStore((s) => s.addExpense);
  const addBill = useFinanceStore((s) => s.addBill);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const accounts = useFinanceStore((s) => s.accounts);
  const creditCards = useFinanceStore((s) => s.creditCards);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);
  const expenses = useFinanceStore((s) => s.expenses);
  const merchantOptions = useMemo(() => merchantSuggestions(expenses), [expenses]);
  const friendOptions = useMemo(() => friendNameSuggestions(expenses), [expenses]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
    setError,
    getValues,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      category: "Food",
      paymentMethod: "UPI",
      date: localDateInputValue(),
      recurring: false,
      planNextPayment: false,
      recurrenceDays: 90,
      sharedEnabled: false,
    },
  });

  const sharedEnabled = useWatch({ control, name: "sharedEnabled" });
  const friendEmail = useWatch({ control, name: "friendEmail" });
  const planNextPayment = useWatch({ control, name: "planNextPayment" });
  const selectedAccountId = useWatch({ control, name: "accountId" });
  const isSharedForm = sharedMode || Boolean(editing?.shared);
  const category = useWatch({ control, name: "category" });
  const isFuel = category === "Fuel";
  const { rate: suggestedRate, source: suggestedRateSource } = useFuelRate(open && isFuel);

  // Prefill only an untouched field. Overwriting a rate the user has just typed
  // because a lookup landed a moment later would be maddening.
  useEffect(() => {
    if (!isFuel || suggestedRate === null) return;
    const current = getValues("ratePerLitre");
    if (current === undefined || current === "") setValue("ratePerLitre", suggestedRate);
  }, [isFuel, suggestedRate, getValues, setValue]);

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              amount: editing.amount,
              category: editing.category,
              merchant: editing.merchant ?? "",
              paymentMethod: editing.paymentMethod,
              note: editing.note ?? "",
              date: editing.date.slice(0, 10),
              recurring: editing.recurring ?? false,
              planNextPayment: false,
              recurrenceDays: 90,
              accountId: editing.accountId ?? "",
              sharedEnabled: isSharedForm,
              totalAmount: editing.shared?.totalAmount,
              friendName: editing.shared?.friendName ?? "",
              friendEmail: editing.shared?.friendEmail ?? "",
              friendPaid: editing.shared?.friendPaid,
              inviteRequested: editing.shared?.inviteRequested ?? false,
              odometerKm: editing.fuel?.odometerKm,
              ratePerLitre: editing.fuel?.ratePerLitre,
            }
          : (() => {
              const defaultAccount = accounts.find(
                (account) =>
                  account.status === "active" && account.defaultFor?.includes("everyday"),
              );
              return {
                amount: undefined,
                category: "Food",
                merchant: "",
                paymentMethod: "UPI",
                note: "",
                date: localDateInputValue(),
                recurring: false,
                planNextPayment: false,
                recurrenceDays: 90,
                accountId: defaultAccount?.id ?? "",
                sharedEnabled: sharedMode,
                totalAmount: undefined,
                friendName: "",
                friendEmail: "",
                friendPaid: undefined,
                inviteRequested: false,
                odometerKm: undefined,
                ratePerLitre: undefined,
              };
            })(),
      );
    }
  }, [open, editing, reset, accounts, isSharedForm, sharedMode]);

  const onSubmit = async (values: FormValues) => {
    const parsed = schema.parse(values);

    const litres =
      parsed.ratePerLitre && parsed.ratePerLitre > 0 ? parsed.amount / parsed.ratePerLitre : null;
    const fuel =
      parsed.category === "Fuel" && litres !== null
        ? {
            odometerKm: parsed.odometerKm,
            litres,
            ratePerLitre: parsed.ratePerLitre!,
            rateSource: resolveRateSource(
              parsed.ratePerLitre!,
              suggestedRate,
              suggestedRateSource,
            ),
            includeInAverage: editing?.fuel?.includeInAverage,
          }
        : undefined;

    // An odometer that goes backwards would produce a negative distance and a
    // segment that silently vanishes, so it is refused at the point of entry.
    if (fuel?.odometerKm != null) {
      const previous = previousOdometer(expenses, dateInputToIso(parsed.date), editing?.id);
      if (previous !== null && fuel.odometerKm <= previous) {
        setError("odometerKm", {
          message: `Must be higher than the last reading of ${previous} km`,
        });
        return;
      }
    }

    const payload = {
      amount: parsed.amount,
      category: parsed.category as Expense["category"],
      merchant: parsed.merchant || undefined,
      paymentMethod: parsed.paymentMethod as Expense["paymentMethod"],
      note: parsed.note || undefined,
      date: dateInputToIso(parsed.date),
      recurring: parsed.recurring,
      accountId: parsed.accountId || undefined,
      // A category changed away from Fuel yields undefined here, which drops the
      // sub-object rather than leaving an orphaned odometer on a grocery bill.
      fuel,
      shared: parsed.sharedEnabled
        ? {
            totalAmount: parsed.totalAmount!,
            friendName: parsed.friendName!.trim(),
            friendEmail: parsed.friendEmail || undefined,
            userPaid: parsed.amount,
            friendPaid: parsed.friendPaid ?? 0,
            inviteRequested: Boolean(parsed.friendEmail && parsed.inviteRequested),
          }
        : undefined,
    };
    const expenseSaved = editing ? updateExpense(editing.id, payload) : addExpense(payload);
    if (!expenseSaved) {
      setError("amount", {
        message: "The selected account does not have enough balance for this payment",
      });
      return;
    }
    if (!editing) {
      if (parsed.planNextPayment && parsed.recurrenceDays) {
        const nextPayment = parseFinancialDate(parsed.date);
        nextPayment.setDate(nextPayment.getDate() + parsed.recurrenceDays);
        addBill({
          name: `${parsed.merchant?.trim() || "Recurring payment"} · ${parsed.recurrenceDays}-day plan`,
          amount: parsed.amount,
          dueDay: nextPayment.getDate(),
          dueDate: dateInputToIso(localDateInputValue(nextPayment)),
          frequency: "interval",
          intervalDays: parsed.recurrenceDays,
          category: parsed.category as Expense["category"],
          paid: false,
          accountId: parsed.accountId || undefined,
        });
      }
    }
    await syncWithServer();
    if (payload.shared?.inviteRequested && payload.shared.friendEmail) {
      await fetch("/api/shared-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          friendName: payload.shared.friendName,
          friendEmail: payload.shared.friendEmail,
          title: payload.merchant || payload.category,
          expenseDate: payload.date,
          totalAmount: payload.shared.totalAmount,
          ownerPaid: payload.shared.userPaid,
          friendPaid: payload.shared.friendPaid,
        }),
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editing
          ? isSharedForm
            ? "Edit shared expense"
            : "Edit expense"
          : sharedMode
            ? "Add shared expense"
            : "Add expense"
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>{sharedEnabled ? "I paid" : "Amount"}</Label>
          <Input
            type="number"
            step="1"
            inputMode="decimal"
            placeholder="0"
            autoFocus
            {...register("amount")}
          />
          {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>}
        </div>

        {(accounts.length > 0 || creditCards.length > 0) && (
          <div>
            <Label htmlFor="expense-account">Paid from</Label>
            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <Select
                  id="expense-account"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                >
                  <option value="">No account selected</option>
                  {accounts
                    .filter((account) => account.status === "active")
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bankName}
                      </option>
                    ))}
                  {creditCards
                    .filter((card) => card.status === "active")
                    .map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} · Credit card
                      </option>
                    ))}
                </Select>
              )}
            />
            {/* Saying "the amount is deducted" while nothing is selected is the
                lie that made bill payments look like they moved money. */}
            <p className={`mt-1 text-xs ${selectedAccountId ? "text-muted" : "text-warning"}`}>
              {!selectedAccountId
                ? "No account selected — this is recorded as spending, but no balance changes."
                : isSharedForm
                  ? "Your payment reduces the selected bank-account balance. Credit cards track usage instead."
                  : "The amount is deducted from the selected bank account. Credit-card purchases appear in card usage instead."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
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
                  value={field.value}
                  onValueChange={field.onChange}
                  ariaLabel="Expense category"
                  placeholder="Select category"
                  searchPlaceholder="Search categories..."
                  emptyText="No category found."
                />
              )}
            />
          </div>
          <div>
            <Label htmlFor="expense-payment-method">Payment</Label>
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <Select
                  id="expense-payment-method"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                >
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Title or place</Label>
            <Controller
              control={control}
              name="merchant"
              render={({ field }) => (
                <SuggestInput
                  placeholder="e.g. Grocery store or restaurant"
                  suggestions={merchantOptions}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              )}
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea placeholder="What was this for?" {...register("note")} />
        </div>

        {isFuel && (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Fill-up details</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expense-odometer">Odometer (km)</Label>
                <Input
                  id="expense-odometer"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="42242"
                  {...register("odometerKm")}
                />
                {errors.odometerKm && (
                  <p className="mt-1 text-xs text-danger">{errors.odometerKm.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="expense-rate">Rate per litre</Label>
                <Input
                  id="expense-rate"
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  {...register("ratePerLitre")}
                />
                {errors.ratePerLitre && (
                  <p className="mt-1 text-xs text-danger">{errors.ratePerLitre.message}</p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              {suggestedRateSource === "live"
                ? "Rate fetched for today. Change it if the pump differs."
                : "Rate carried over from your last fill. Change it if the price moved."}{" "}
              Odometer is optional — without it this records the spend only.
            </p>
          </div>
        )}

        {isSharedForm && (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Split details</p>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total bill</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    {...register("totalAmount")}
                  />
                  {errors.totalAmount && (
                    <p className="mt-1 text-xs text-danger">{errors.totalAmount.message}</p>
                  )}
                </div>
                <div>
                  <Label>Friend paid</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    {...register("friendPaid")}
                  />
                  {errors.friendPaid && (
                    <p className="mt-1 text-xs text-danger">{errors.friendPaid.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Friend&apos;s name</Label>
                  <Controller
                    control={control}
                    name="friendName"
                    render={({ field }) => (
                      <SuggestInput
                        placeholder="e.g. Swarali"
                        suggestions={friendOptions}
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    )}
                  />
                  {errors.friendName && (
                    <p className="mt-1 text-xs text-danger">{errors.friendName.message}</p>
                  )}
                </div>
                <div>
                  <Label>Email (optional)</Label>
                  <Input
                    type="email"
                    placeholder="friend@example.com"
                    {...register("friendEmail")}
                  />
                  {errors.friendEmail && (
                    <p className="mt-1 text-xs text-danger">{errors.friendEmail.message}</p>
                  )}
                </div>
              </div>
              {friendEmail && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox {...register("inviteRequested")} />
                  Send an invitation to view this shared record
                </label>
              )}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <Checkbox {...register("recurring")} />
          Mark as recurring
        </label>

        {!editing && (
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <Controller
              control={control}
              name="planNextPayment"
              render={({ field }) => (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={Boolean(field.value)}
                    onChange={(event) => field.onChange(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">Plan the next payment</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      Adds a future bill and reserves part of the amount each salary cycle.
                    </span>
                  </span>
                </label>
              )}
            />
            {planNextPayment && (
              <div className="mt-4">
                <Label>Repeat after</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    className="max-w-28"
                    {...register("recurrenceDays")}
                  />
                  <span className="text-sm text-muted">days</span>
                </div>
                {errors.recurrenceDays && (
                  <p className="mt-1 text-xs text-danger">{errors.recurrenceDays.message}</p>
                )}
                <p className="mt-2 text-xs text-muted">
                  For a 90-day ₹899 recharge, Salary Plan reserves about ₹300 per salary cycle.
                </p>
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? "Save changes" : sharedMode ? "Add shared expense" : "Add expense"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
