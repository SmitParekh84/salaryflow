"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CATEGORIES, CATEGORY_META, PAYMENT_METHODS } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than 0"),
  category: z.string().min(1),
  merchant: z.string().optional(),
  paymentMethod: z.string().min(1),
  note: z.string().optional(),
  date: z.string().min(1),
  recurring: z.boolean().optional(),
});

type FormValues = z.input<typeof schema>;

export function ExpenseForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Expense | null;
}) {
  const addExpense = useFinanceStore((s) => s.addExpense);
  const updateExpense = useFinanceStore((s) => s.updateExpense);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      category: "Food",
      paymentMethod: "UPI",
      date: new Date().toISOString().slice(0, 10),
      recurring: false,
    },
  });

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
            }
          : {
              amount: undefined,
              category: "Food",
              merchant: "",
              paymentMethod: "UPI",
              note: "",
              date: new Date().toISOString().slice(0, 10),
              recurring: false,
            }
      );
    }
  }, [open, editing, reset]);

  const onSubmit = (values: FormValues) => {
    const parsed = schema.parse(values);
    const payload = {
      amount: parsed.amount,
      category: parsed.category as Expense["category"],
      merchant: parsed.merchant || undefined,
      paymentMethod: parsed.paymentMethod as Expense["paymentMethod"],
      note: parsed.note || undefined,
      date: new Date(parsed.date).toISOString(),
      recurring: parsed.recurring,
    };
    if (editing) updateExpense(editing.id, payload);
    else addExpense(payload);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit expense" : "Add expense"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            step="1"
            inputMode="decimal"
            placeholder="0"
            autoFocus
            {...register("amount")}
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select {...register("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].emoji} {c}
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
            <Label>Merchant</Label>
            <Input placeholder="e.g. Swiggy" {...register("merchant")} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
          </div>
        </div>

        <div>
          <Label>Note</Label>
          <Textarea placeholder="Optional note…" {...register("note")} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...register("recurring")} />
          Mark as recurring
        </label>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {editing ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
