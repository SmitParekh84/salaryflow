import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  /** Used by grouped skeletons to stagger `animation-delay`. */
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer animate-pulse rounded-xl bg-surface-2", className)}
      style={style}
    />
  );
}
