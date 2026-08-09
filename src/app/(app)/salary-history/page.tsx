"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Input, Label } from "@/components/ui/input";
import {
  currentFinancialYearStart,
  financialYearLabel,
  isInFinancialYear,
} from "@/lib/financial-year";
import { useFinanceStore } from "@/lib/store";
import { formatMoney, localDateInputValue, newestFirst, parseFinancialDate } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarDays, Check, Clock3, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function SalaryHistoryPage() {
  const profile = useFinanceStore((state) => state.profile);
  const entries = useFinanceStore((state) => state.salaryHistory);
  const loadSalaryHistory = useFinanceStore((state) => state.loadSalaryHistory);
  const addSalaryEntry = useFinanceStore((state) => state.addSalaryEntry);
  const updateSalaryEntry = useFinanceStore((state) => state.updateSalaryEntry);
  const deleteSalaryEntry = useFinanceStore((state) => state.deleteSalaryEntry);
  const [month, setMonth] = useState(localDateInputValue().slice(0, 7));
  const [amountInput, setAmountInput] = useState("");
  const [note, setNote] = useState("");
  const [credited, setCredited] = useState(true);
  const [saving, setSaving] = useState(false);
  const financialYearStart = profile.financialYearStart ?? currentFinancialYearStart();
  const visibleEntries = entries.filter((entry) =>
    isInFinancialYear(entry.date, financialYearStart),
  );

  useEffect(() => {
    void loadSalaryHistory();
  }, [loadSalaryHistory]);

  const amount = amountInput === "" ? profile.amount || 31431 : Number(amountInput);
  const variance = amount - profile.amount;
  const selectedDate = `${month}-${String(profile.salaryDay).padStart(2, "0")}`;

  async function saveSalary() {
    if (!month || amount <= 0) return;
    setSaving(true);
    await addSalaryEntry({
      amount,
      date: selectedDate,
      source: "salary",
      note: note.trim() || undefined,
      confirmed: credited,
    });
    setSaving(false);
    setNote("");
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Record one salary credit per month. Your normal salary is{" "}
        {formatMoney(profile.amount, profile.currency)}. Showing {financialYearLabel(financialYearStart)}.
      </p>

      <Card className="p-4 shadow-none sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="salary-month">Salary month</Label>
            <Input
              id="salary-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="salary-amount">Amount credited</Label>
            <Input
              id="salary-amount"
              type="number"
              min={1}
              value={amountInput || amount}
              onChange={(event) => setAmountInput(event.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="salary-note">
              {variance < 0 ? "Why was it lower? (optional)" : "Note (optional)"}
            </Label>
            <Input
              id="salary-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={variance < 0 ? "e.g. Took unpaid leave" : "e.g. Overtime allowance"}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={credited}
                onChange={(event) => setCredited(event.target.checked)}
              />
              Salary credited
            </label>
            {variance > 0 && (
              <Badge color="var(--success)">
                +{formatMoney(variance, profile.currency)} allowance / overtime
              </Badge>
            )}
            {variance < 0 && (
              <Badge color="var(--warning)">
                {formatMoney(Math.abs(variance), profile.currency)} below normal
              </Badge>
            )}
          </div>
          <Button disabled={saving || !month || amount <= 0} onClick={() => void saveSalary()}>
            {saving ? "Saving..." : "Save month"}
          </Button>
        </div>
      </Card>

      {visibleEntries.length === 0 ? (
        <Card className="p-8 text-center shadow-none">
          <CalendarDays className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-2 text-sm font-medium">No salary months recorded</p>
        </Card>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {newestFirst(visibleEntries).map((entry) => {
            const difference =
              entry.varianceAmount ?? entry.amount - (entry.baseAmount ?? profile.amount);
            return (
              <div
                key={entry._id ?? entry.date}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-4 sm:flex sm:flex-wrap sm:gap-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {entry.confirmed ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {format(parseFinancialDate(entry.date), "LLLL yyyy")}
                  </p>
                  <p className="text-xs text-muted">
                    Base {formatMoney(entry.baseAmount ?? profile.amount, profile.currency)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 sm:contents">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold">
                      {formatMoney(entry.amount, profile.currency)}
                    </p>
                    {difference > 0 && (
                      <p className="flex items-center gap-1 text-xs text-success sm:justify-end">
                        <Plus className="h-3 w-3" /> {formatMoney(difference, profile.currency)}{" "}
                        extra
                      </p>
                    )}
                    {difference < 0 && (
                      <p className="flex items-center gap-1 text-xs text-warning sm:justify-end">
                        <Minus className="h-3 w-3" />{" "}
                        {formatMoney(Math.abs(difference), profile.currency)} lower
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        entry._id &&
                        void updateSalaryEntry(entry._id, { confirmed: !entry.confirmed })
                      }
                    >
                      {entry.confirmed ? "Credited" : "Mark credited"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${format(parseFinancialDate(entry.date), "LLLL yyyy")} salary`}
                      onClick={() => entry._id && void deleteSalaryEntry(entry._id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
