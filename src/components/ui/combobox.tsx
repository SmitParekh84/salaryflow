"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useState } from "react";

export interface ComboboxOption {
  label: string;
  value: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
}: {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn("h-11 w-full justify-between px-3.5 font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-[70] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface shadow-md"
        >
          <Command className="w-full" loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <Command.Input
                placeholder={searchPlaceholder}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
            <Command.List className="max-h-64 overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                {emptyText}
              </Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-surface-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{option.label}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
