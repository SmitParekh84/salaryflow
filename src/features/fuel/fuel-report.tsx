"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MileageTrendChart } from "@/features/analytics/lazy-charts";
import { DEFAULT_VEHICLE, type FuelFilter, confidenceLabel, fuelSummary } from "@/lib/fuel";
import { useFinanceStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";
import { useMemo, useState } from "react";

const FILTERS: { id: FuelFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "with-km", label: "With km" },
  { id: "without-km", label: "Without km" },
];

export function FuelReport() {
  const expenses = useFinanceStore((state) => state.expenses);
  const currency = useFinanceStore((state) => state.profile.currency);
  const vehicle = useFinanceStore((state) => state.profile.vehicle) ?? DEFAULT_VEHICLE;
  const updateExpense = useFinanceStore((state) => state.updateExpense);
  const syncWithServer = useFinanceStore((state) => state.syncWithServer);
  const [filter, setFilter] = useState<FuelFilter>("all");

  const summary = useMemo(
    () => fuelSummary(expenses, vehicle, filter),
    [expenses, vehicle, filter],
  );
  const segmentById = useMemo(
    () => new Map(summary.segments.map((segment) => [segment.id, segment])),
    [summary.segments],
  );
  const hasAnyFuel = useMemo(
    () => expenses.some((expense) => expense.category === "Fuel"),
    [expenses],
  );

  if (!hasAnyFuel) return null;

  const setIncluded = (id: string, included: boolean) => {
    const existing = expenses.find((expense) => expense.id === id);
    if (!existing?.fuel) return;
    updateExpense(id, { fuel: { ...existing.fuel, includeInAverage: included } });
    void syncWithServer();
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Fuel · {vehicle.name}</CardTitle>
        <div className="flex gap-1">
          {FILTERS.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={filter === option.id ? "primary" : "ghost"}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure
            label="Mileage"
            value={summary.kmpl === null ? "—" : `${summary.kmpl.toFixed(1)} kmpl`}
            hint={
              confidenceLabel(summary) ??
              (summary.kmpl === null ? "needs two readings" : undefined)
            }
          />
          <Figure
            label="Cost"
            value={
              summary.costPerKm === null ? "—" : `${formatMoney(summary.costPerKm, currency)}/km`
            }
          />
          <Figure label="Spent" value={formatMoney(summary.totalSpend, currency)} />
          <Figure label="Measured" value={`${Math.round(summary.totalDistanceKm)} km`} />
        </div>

        {/* The view that shows only unmeasured fills must not quietly carry a
            mileage over from the other one. */}
        {filter === "without-km" && (
          <p className="text-xs text-muted">
            These fills have no odometer reading, so they can only be counted as spending. Add a
            reading at the pump to measure them.
          </p>
        )}

        {summary.segments.some((segment) => segment.included) && (
          <MileageTrendChart segments={summary.segments} />
        )}

        <div className="-mx-1 overflow-x-auto">
          <div className="min-w-[36rem] divide-y divide-border px-1">
            {summary.fills.map((expense) => {
              const segment = segmentById.get(expense.id);
              return (
                <div key={expense.id} className="flex items-baseline gap-4 py-2 text-sm">
                  <span className="w-20 shrink-0 text-muted">{formatDate(expense.date)}</span>
                  <span className="w-20 shrink-0">{formatMoney(expense.amount, currency)}</span>
                  <span className="w-24 shrink-0 text-muted">
                    {expense.fuel?.odometerKm != null
                      ? `${expense.fuel.odometerKm} km`
                      : "no reading"}
                  </span>
                  <span className="w-16 shrink-0 text-muted">
                    {segment ? `${segment.distanceKm} km` : "—"}
                  </span>
                  <span className="w-24 shrink-0 font-medium">
                    {segment ? `${segment.kmpl.toFixed(1)} kmpl` : "start"}
                  </span>
                  {segment?.flagged && (
                    <span className="flex items-center gap-2 text-xs text-warning">
                      looks off — missed a fill?
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setIncluded(expense.id, !segment.included)}
                      >
                        {segment.included ? "set aside" : "count it anyway"}
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
