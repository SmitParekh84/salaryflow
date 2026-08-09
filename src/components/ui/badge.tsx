import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-(--ring)",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-surface-2 text-foreground",
        outline: "border-border text-foreground",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        destructive: "border-transparent bg-danger/15 text-danger",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

export function Badge({
  className,
  color,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & { color?: string }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
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
