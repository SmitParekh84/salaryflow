"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "var(--primary)",
  trend,
  hint,
  delay = 0,
  row = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  trend?: number;
  hint?: string;
  delay?: number;
  /**
   * Icon beside the number instead of above it. Four of these in a row are
   * shorter this way, which is what lets the dashboard put real content beside
   * them rather than below.
   */
  row?: boolean;
}) {
  if (row) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
        /*
         * Column on a phone, row from `sm`. Two tiles to a row leaves ~190px,
         * and taking 44px of that for the icon pushed every label onto two
         * lines and every hint onto three, so the four tiles ended up different
         * heights. Above the icon, the text gets the full width of the tile.
         */
        className="flex min-w-0 flex-col gap-2.5 bg-surface p-4 sm:flex-row sm:items-start sm:gap-3.5 sm:p-5"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
            color: accent,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{label}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {typeof trend === "number" && <TrendPill trend={trend} />}
          </div>
          {hint && <p className="mt-1 text-[11px] leading-snug text-muted">{hint}</p>}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="min-w-0 bg-surface p-5"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
            color: accent,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {typeof trend === "number" && <TrendPill trend={trend} />}
      </div>
      <p className="mt-4 text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </motion.div>
  );
}

function TrendPill({ trend }: { trend: number }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        trend >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
      )}
    >
      {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(trend)}%
    </span>
  );
}
