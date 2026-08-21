"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export type SegmentedControlItem<T extends string> = { value: T; label: string };

/**
 * A row of two to five mutually exclusive options, one of which is always
 * selected.
 *
 * Built on `Button` so the segments share the app's button states rather than
 * inventing a second set. It is not `Tabs`: nothing here owns a panel, the
 * selected value only swaps content the caller renders, and roving-tabindex
 * keyboard movement is what a segmented control owes the reader.
 *
 * `tone="marketing"` paints it from the fixed-light marketing tokens, for the
 * public pages whose palette does not follow the reader's dark-mode setting.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  items,
  label,
  tone = "app",
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  items: SegmentedControlItem<T>[];
  /** Names the group for screen readers. */
  label: string;
  tone?: "app" | "marketing";
  className?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);

  // Arrow keys move the selection and take focus with it, which is what a
  // roving-tabindex group is expected to do: only the selected segment is
  // tabbable, so Tab enters and leaves the whole control once.
  function handleKeyDown(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = items.findIndex((item) => item.value === value);
    const next = items[(index + step + items.length) % items.length];
    onValueChange(next.value);
    const buttons = groupRef.current?.querySelectorAll("button");
    buttons?.[items.indexOf(next)]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex gap-1 rounded-xl p-1",
        tone === "marketing"
          ? "border border-marketing-border bg-marketing-wash"
          : "bg-surface-2",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            size="md"
            variant={
              selected
                ? tone === "marketing"
                  ? "marketingOutline"
                  : "secondary"
                : tone === "marketing"
                  ? "marketingGhost"
                  : "ghost"
            }
            onClick={() => onValueChange(item.value)}
            className="flex-1"
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
