import { cn } from "@/lib/utils";
import * as React from "react";

export function Badge({
  className,
  color,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={
        color
          ? {
              backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
              color,
            }
          : undefined
      }
      {...props}
    />
  );
}
