"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { dateInputToIso, localDateInputValue } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const schema = z
  .object({
    amount: z.coerce.number().positive("Enter an amount greater than 0"),
    category: z.string().min(1),
    merchant: z.string().optional(),
    paymentMethod: z.string().min(1),
    note: z.string().optional(),
    date: z.string().min(1),
    recurring: z.boolean().optional(),
    accountId: z.string().optional(),
    sharedEnabled: z.boolean().optional(),
    totalAmount: z.coerce.number().nonnegative().optional(),
    friendName: z.string().optional(),
    friendEmail: z.union([z.literal(""), z.string().email("Enter a valid email")]).optional(),
    friendPaid: z.coerce.number().nonnegative().optional(),
    inviteRequested: z.boolean().optional(),
  })
  .superRefine((values, context) => {
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
  const addExpense = useFinanceStore((s) => s.addExpense);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const accounts = useFinanceStore((s) => s.accounts);
  const creditCards = useFinanceStore((s) => s.creditCards);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      category: "Food",
      paymentMethod: "UPI",
      date: localDateInputValue(),
      recurring: false,
      sharedEnabled: false,
    },
  });

  const sharedEnabled = useWatch({ control, name: "sharedEnabled" });
  const friendEmail = useWatch({ control, name: "friendEmail" });
  const isSharedForm = sharedMode || Boolean(editing?.shared);

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
              accountId: editing.accountId ?? "",
              sharedEnabled: isSharedForm,
              totalAmount: editing.shared?.totalAmount,
              friendName: editing.shared?.friendName ?? "",
              friendEmail: editing.shared?.friendEmail ?? "",
              friendPaid: editing.shared?.friendPaid,
              inviteRequested: editing.shared?.inviteRequested ?? false,
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
                accountId: defaultAccount?.id ?? "",
                sharedEnabled: sharedMode,
                totalAmount: undefined,
                friendName: "",
                friendEmail: "",
                friendPaid: undefined,
                inviteRequested: false,
              };
            })(),
      );
    }
  }, [open, editing, reset, accounts, isSharedForm, sharedMode]);

  const onSubmit = async (values: FormValues) => {
    const parsed = schema.parse(values);
    const payload = {
      amount: parsed.amount,
      category: parsed.category as Expense["category"],
      merchant: parsed.merchant || undefined,
      paymentMethod: parsed.paymentMethod as Expense["paymentMethod"],
      note: parsed.note || undefined,
      date: dateInputToIso(parsed.date),
      recurring: parsed.recurring,
      accountId: parsed.accountId || undefined,
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
    if (editing) updateExpense(editing.id, payload);
    else addExpense(payload);
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
            <Label>Paid from</Label>
            <Select {...register("accountId")}>
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
            <p className="mt-1 text-xs text-muted">
              Records the source only. Your balance will not change automatically.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select {...register("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Payment</Label>
            <Select {...register("paymentMethod")}>
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Title or place</Label>
            <Input placeholder="e.g. Hotel Adhyay Palace" {...register("merchant")} />
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
                  <Input placeholder="e.g. Swarali" {...register("friendName")} />
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
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--primary)]"
                    {...register("inviteRequested")}
                  />
                  Send an invitation to view this shared record
                </label>
              )}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            {...register("recurring")}
          />
          Mark as recurring
        </label>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {editing ? "Save changes" : sharedMode ? "Add shared expense" : "Add expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
