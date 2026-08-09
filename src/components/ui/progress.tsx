"use client";

import { cn } from "@/lib/utils";
import * as ProgressPrimitive from "@radix-ui/react-progress";

export function Progress({
  value,
  className,
  color = "var(--primary)",
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={normalizedValue}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-surface-2",
        className,
      )}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full transition-transform duration-500 ease-out"
        style={{
          background: color,
          transform: `translateX(-${100 - normalizedValue}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}
