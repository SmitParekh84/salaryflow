"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_VEHICLE, confidenceLabel, fuelSummary } from "@/lib/fuel";
import { useFinanceStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";
import { Fuel } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function FuelCard() {
  const expenses = useFinanceStore((state) => state.expenses);
  const currency = useFinanceStore((state) => state.profile.currency);
  const vehicle = useFinanceStore((state) => state.profile.vehicle) ?? DEFAULT_VEHICLE;

  const summary = useMemo(() => fuelSummary(expenses, vehicle), [expenses, vehicle]);

  // Someone who never buys fuel should not carry a dead card on their dashboard.
  if (summary.fills.length === 0) return null;

  const latest = summary.fills[0];
  const provisional = confidenceLabel(summary);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Fuel className="h-4 w-4 text-muted" />
          {vehicle.name}
          {vehicle.year && <span className="text-muted">· {vehicle.year}</span>}
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-2xl font-bold tracking-tight">
            {summary.kmpl === null ? "—" : `${summary.kmpl.toFixed(1)} kmpl`}
          </p>
          <p className="text-sm text-muted">
            {summary.costPerKm === null ? "—" : `${formatMoney(summary.costPerKm, currency)} / km`}
          </p>
        </div>

        {/* Saying how green the number is beats printing it bare: one partial
            top-up is not yet evidence of anything. */}
        <p className="mt-1 text-[11px] text-muted">
          {provisional ??
            (summary.kmpl === null
              ? "Add an odometer reading at your next fill to see mileage"
              : `${Math.round(summary.totalDistanceKm)} km measured`)}
        </p>

        <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
          Last fill {formatDate(latest.date)} · {formatMoney(latest.amount, currency)}
          {latest.fuel?.odometerKm != null && ` · ${latest.fuel.odometerKm} km`}
        </div>

        <Link href="/analytics" className="mt-3 inline-block text-xs font-medium text-primary">
          Fuel report →
        </Link>
      </CardContent>
    </Card>
  );
}
