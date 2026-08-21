"use client";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

export const buttonVariants = cva(
  // Icons are sized here rather than at every call site: a bare lucide glyph is
  // 24px, which dwarfs a 14px label. An explicit `size-*` on the icon still
  // wins, so the places that want a larger glyph keep it.
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 outline-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--ring) disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90",
        secondary: "bg-surface-2 text-foreground hover:bg-border",
        ghost: "text-foreground hover:bg-surface-2",
        // Not `text-white`: --danger is a lighter red in dark mode, where white
        // sits on it at 2.2:1. The paired token flips with the theme.
        danger: "bg-danger text-danger-foreground hover:bg-danger/90",
        destructive: "bg-danger text-danger-foreground hover:bg-danger/90",
        success: "bg-success text-white hover:bg-success/90",
        warning: "bg-warning text-white hover:bg-warning/90",
        outline: "bg-transparent text-foreground ring-1 ring-inset ring-border hover:bg-surface-2",
        link: "h-auto min-h-0 min-w-0 text-primary underline-offset-4 hover:underline",
        /*
         * The two public-page actions. They are painted from the marketing
         * tokens rather than the theme ones because that surface fixes a light
         * palette: `primary` on it was a theme-coloured button on a permanently
         * white band, and `secondary`'s hover (--surface-2 to --border) washed
         * its own label out to near-invisible for a reader whose app theme was
         * dark. Pair them: `marketing` for the one real action, then
         * `marketingOutline` for everything beside it.
         */
        marketing:
          "bg-[image:var(--marketing-action)] text-white shadow-sm shadow-marketing-ink/15 hover:brightness-[1.12]",
        marketingOutline:
          "bg-marketing-surface text-marketing-ink ring-1 ring-inset ring-marketing-border hover:bg-marketing-wash",
        /* The unselected state inside a marketing `SegmentedControl`. */
        marketingGhost:
          "bg-transparent text-marketing-ink/55 hover:bg-marketing-surface/60 hover:text-marketing-ink",
      },
      size: {
        sm: "h-11 rounded-xl px-3 text-xs",
        md: "h-11 rounded-xl px-4 text-sm",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-11 w-11 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks input. The label stays mounted so the button cannot resize. */
  loading?: boolean;
}

/**
 * Deliberately faster than a default 1s spin: a quicker spinner makes the same
 * wait feel shorter. Sized to the cap height of the label it sits on.
 */
function Spinner() {
  return (
    <svg
      className="size-4 animate-spin [animation-duration:0.6s]"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // `asChild` forwards to an arbitrary element, which cannot host the overlay.
    const isLoading = loading && !asChild;

    return (
      <Comp
        ref={ref}
        data-slot="button"
        // The label keeps its space and only fades, so the button never resizes
        // mid-submit — a width change under the user's finger reads as a glitch.
        // `disabled:opacity-100` overrides the base disabled dimming: a loading
        // button is working, not unavailable, and should not look greyed out.
        className={cn(
          buttonVariants({ variant, size }),
          isLoading && "relative disabled:opacity-100",
          className,
        )}
        {...props}
        aria-busy={isLoading || undefined}
        disabled={isLoading || props.disabled}
      >
        {isLoading ? (
          <>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
            <span className="inline-flex items-center gap-2 opacity-0">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
