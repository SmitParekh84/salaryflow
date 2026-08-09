import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer animate-pulse rounded-xl bg-surface-2", className)}
    />
  );
}
