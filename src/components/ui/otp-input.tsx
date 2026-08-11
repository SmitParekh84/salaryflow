"use client";

import {
  firstEmptyIndex,
  isComplete,
  parsePastedOtp,
  removeDigitAt,
  sanitizeOtp,
  setDigitAt,
} from "@/lib/otp";
import { cn } from "@/lib/utils";
import * as React from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Fires once, when the final digit lands. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  /** Applied to the first box so a `<Label htmlFor>` focuses the field. */
  id?: string;
  "aria-label"?: string;
};

/**
 * Segmented verification-code field.
 *
 * Each box is a real input carrying `inputMode="numeric"` and `pattern="[0-9]*"`
 * — that pair is what raises the phone number pad rather than the full keyboard.
 * `autoComplete="one-time-code"` sits on the first box only, so iOS Mail
 * autofill lands in a predictable place; when it arrives it delivers the whole
 * code at once, which is handled as a paste.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  autoFocus,
  invalid,
  id,
  "aria-label": ariaLabel = "Verification code",
}: OtpInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = sanitizeOtp(value, length);

  const focusBox = (index: number) => {
    const target = refs.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  const commit = (next: string, focusIndex: number) => {
    onChange(next);
    focusBox(focusIndex);
    if (!isComplete(digits, length) && isComplete(next, length)) onComplete?.(next);
  };

  const handleChange = (index: number, raw: string) => {
    // Autofill and paste both hand over more than one character at a time.
    if (raw.length > 1) {
      const pasted = parsePastedOtp(raw, length);
      if (pasted) commit(pasted, firstEmptyIndex(pasted, length));
      return;
    }
    const next = setDigitAt(digits, index, raw, length);
    if (next !== digits) commit(next, index + 1);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        commit(removeDigitAt(digits, index), index);
      } else if (index > 0) {
        commit(removeDigitAt(digits, index - 1), index - 1);
      }
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      commit(removeDigitAt(digits, index), index);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = parsePastedOtp(event.clipboardData.getData("text"), length);
    if (pasted) commit(pasted, firstEmptyIndex(pasted, length));
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("grid gap-2", disabled && "opacity-60")}
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={digits[index] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          className={cn(
            // 16px minimum keeps iOS Safari from zooming the page on focus.
            "h-13 w-full min-w-0 rounded-xl border border-transparent bg-surface-2 text-center font-mono text-lg text-foreground outline-none transition-[color,box-shadow,border-color]",
            "focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-(--ring)",
            "disabled:cursor-not-allowed",
            invalid && "border-danger/40",
          )}
        />
      ))}
    </div>
  );
}
