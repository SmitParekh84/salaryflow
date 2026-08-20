"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_VEHICLE, confidenceLabel, fuelSummary } from "@/lib/fuel";
import { useFinanceStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";
import { ChevronRight, Fuel } from "lucide-react";
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
      {/*
       * The whole card is the link to the fuel report. It shares a dashboard
       * column with insights and bills, so it earns its height by showing the
       * two numbers someone actually checks — mileage and cost per km — and
       * leaving the fill history to the report.
       */}
      <CardContent className="p-0">
        <Link
          href="/analytics"
          className="group flex items-center gap-3.5 rounded-2xl p-4 outline-none transition-colors hover:bg-surface-2/50 focus-visible:ring-2 focus-visible:ring-(--ring)"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <Fuel className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {vehicle.name}
              {vehicle.year && <span className="font-normal text-muted"> · {vehicle.year}</span>}
            </p>
            {/*
             * Both numbers on one line rather than in two labelled columns: at
             * the width of this column a two-column split truncated "50.3 km/l"
             * to "50.3 k…", and the units already say which number is which.
             */}
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-semibold">
                {summary.kmpl === null ? "—" : `${summary.kmpl.toFixed(1)} km/l`}
              </span>
              <span className="text-muted">
                {summary.costPerKm === null
                  ? ""
                  : `· ${formatMoney(summary.costPerKm, currency)} / km`}
              </span>
            </p>
            {/* Saying how green the number is beats printing it bare: one
                partial top-up is not yet evidence of anything. */}
            <p className="mt-2 truncate text-[11px] text-muted">
              {provisional ??
                (summary.kmpl === null
                  ? "Add an odometer reading at your next fill"
                  : `Last fill ${formatDate(latest.date)} · ${formatMoney(latest.amount, currency)}`)}
            </p>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
