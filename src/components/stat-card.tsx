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
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  trend?: number;
  hint?: string;
  delay?: number;
}) {
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
          {typeof trend === "number" && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                trend >= 0
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {trend >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
      </div>
        <p className="mt-4 text-xs font-medium text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </motion.div>
  );
}
