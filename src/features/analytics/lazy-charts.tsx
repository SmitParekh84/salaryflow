"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

/**
 * The charting library, kept off the first paint.
 *
 * Recharts is by a wide margin the largest thing in the client bundle — bigger
 * than the rest of the app's own code put together — and `charts.tsx` was
 * imported statically by both the dashboard and the analytics page. That put it
 * on the critical path of the screen every session opens on, where it had to be
 * downloaded, parsed and executed before anything on the page could respond to
 * a tap. On a mid-range phone that is the difference between a dashboard that
 * reacts immediately and one that ignores the first second of input.
 *
 * Every chart on the dashboard sits below the Safe-to-Spend hero and the stat
 * row, so none of them is visible when the page opens on a phone. Loading them
 * after hydration costs nothing anyone can see, and each placeholder reserves
 * exactly the height its chart will take, so nothing shifts underneath a finger
 * when the real thing arrives.
 *
 * `ssr: false` because the charts measure their container before they can draw:
 * there is no useful server render to hydrate.
 */
function ChartFallback({ height }: { height: number }) {
  return <Skeleton className="w-full" style={{ height }} />;
}

export const SpendTrendChart = dynamic(
  () => import("./charts").then((m) => m.SpendTrendChart),
  { ssr: false, loading: () => <ChartFallback height={200} /> },
);

export const CashFlowChart = dynamic(() => import("./charts").then((m) => m.CashFlowChart), {
  ssr: false,
  loading: () => <ChartFallback height={240} />,
});

/**
 * The donut is the one chart that isn't alone in its box: a legend sits beside
 * it on a wide screen and underneath it on a phone. A single rectangle would
 * hold the wrong height in the stacked case and the content below would jump,
 * so the placeholder mirrors the real arrangement instead.
 */
function DonutFallback() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <Skeleton className="h-[200px] w-[200px] shrink-0 rounded-full" />
      <div className="grid w-full grid-cols-1 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <Skeleton key={row} className="h-4 rounded-md" />
        ))}
      </div>
    </div>
  );
}

export const CategoryDonut = dynamic(() => import("./charts").then((m) => m.CategoryDonut), {
  ssr: false,
  loading: () => <DonutFallback />,
});

export const IncomeExpenseBars = dynamic(
  () => import("./charts").then((m) => m.IncomeExpenseBars),
  { ssr: false, loading: () => <ChartFallback height={220} /> },
);

export const MonthlyBars = dynamic(() => import("./charts").then((m) => m.MonthlyBars), {
  ssr: false,
  loading: () => <ChartFallback height={240} />,
});
