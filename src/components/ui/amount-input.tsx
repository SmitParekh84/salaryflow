"use client";

import { Input } from "@/components/ui/input";
import {
  formatGrouped,
  normalizeOnBlur,
  sanitizeNumericInput,
  type Decimals,
} from "@/lib/number-input";
import { cn } from "@/lib/utils";
import * as React from "react";

type AmountInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode" | "prefix"
> & {
  value: string;
  onChange: (value: string) => void;
  /** 2 for money, 0 for counts like day-of-month or a percentage. */
  decimals?: Decimals;
  /** Currency symbol or unit shown inside the field. */
  prefix?: React.ReactNode;
  invalid?: boolean;
};

/**
 * Numeric field for money and counts.
 *
 * Deliberately `type="text"` with `inputMode="decimal"`: that still raises the
 * numeric keypad on mobile, but avoids `type="number"`'s real defects — the
 * scroll wheel silently changing a focused amount, no thousands grouping, and
 * locale-dependent decimal parsing.
 *
 * The value is a string. Empty and "0" stay distinct, so a cleared field cannot
 * be mistaken for a zero. Range checks live in the schema layer, not here.
 */
export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  (
    { value, onChange, decimals = 2, prefix, invalid, className, onFocus, onBlur, ...props },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);

    // Grouped while at rest so long amounts stay readable; raw while editing so
    // the caret does not jump over separators the user did not type.
    const display = focused ? value : formatGrouped(value);

    const field = (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(sanitizeNumericInput(event.target.value, decimals))}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          const normalized = normalizeOnBlur(value);
          if (normalized !== value) onChange(normalized);
          onBlur?.(event);
        }}
        className={cn(
          // 16px on small screens: iOS Safari auto-zooms into any field below that.
          "text-base sm:text-sm",
          prefix && "pl-8",
          invalid && "border-danger/40 focus-visible:border-danger/50",
          className,
        )}
        {...props}
      />
    );

    if (!prefix) return field;

    return (
      <span className="relative block">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted"
        >
          {prefix}
        </span>
        {field}
      </span>
    );
  },
);
AmountInput.displayName = "AmountInput";
