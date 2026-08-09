"use client";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

export const buttonVariants = cva(
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--ring) disabled:pointer-events-none disabled:opacity-50 sm:min-h-0 sm:min-w-0 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90",
        secondary: "bg-surface-2 text-foreground hover:bg-border",
        ghost: "text-foreground hover:bg-surface-2",
        danger: "bg-danger text-white hover:bg-danger/90",
        destructive: "bg-danger text-white hover:bg-danger/90",
        success: "bg-success text-white hover:bg-success/90",
        warning: "bg-warning text-white hover:bg-warning/90",
        outline: "bg-transparent text-foreground ring-1 ring-inset ring-border hover:bg-surface-2",
        link: "h-auto min-h-0 min-w-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 rounded-xl px-3 text-xs sm:h-8",
        md: "h-11 rounded-xl px-4 text-sm sm:h-10",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-11 w-11 rounded-xl p-0 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
