"use client";

import { Input } from "@/components/ui/input";
import { filterSuggestions } from "@/lib/suggestions";
import { cn } from "@/lib/utils";
import { useId, useMemo, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

/**
 * A text field that offers what the user has typed before.
 *
 * Deliberately not the `Combobox`: that is a picker over a fixed list, and
 * these fields have to accept a place or a person recorded for the first time.
 * The list here only ever saves typing.
 */
export function SuggestInput({
  value,
  onValueChange,
  suggestions,
  onBlur,
  onFocus,
  onKeyDown,
  className,
  ...props
}: NativeInputProps & {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value]);
  const isOpen = open && matches.length > 0;
  // The list can shrink under a held arrow key as the query narrows.
  const active = activeIndex < matches.length ? activeIndex : -1;

  function choose(label: string) {
    onValueChange(label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);

    if (!isOpen) {
      if (event.key === "ArrowDown" && matches.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(active >= matches.length - 1 ? 0 : active + 1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(active <= 0 ? matches.length - 1 : active - 1);
      return;
    }
    if (event.key === "Enter" && active >= 0) {
      // Enter takes the highlighted name. Without this it would also submit
      // the expense, saving whatever half-typed text is in the field.
      event.preventDefault();
      choose(matches[active]);
      return;
    }
    if (event.key === "Escape") {
      // The form lives in a dialog that closes on Escape. While the list is
      // open, Escape belongs to the list.
      event.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        className={className}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setOpen(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          setOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-xl bg-surface p-1.5 shadow-lg"
        >
          {matches.map((label, index) => (
            <li key={label}>
              <button
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                // Pointer-down, not click: a click fires after the input has
                // already blurred and closed the list, so the choice is lost.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(label);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex h-11 w-full items-center truncate rounded-lg px-2.5 text-left text-sm outline-none",
                  index === active && "bg-surface-2",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
