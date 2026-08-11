"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

export interface ComboboxOption {
  label: string;
  value: string;
  icon?: ReactNode;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  ariaLabel,
  className,
}: {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [listElement, setListElement] = useState<HTMLDivElement | null>(null);
  const lastTouchY = useRef<number | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!listElement) return;

    const scrollWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      listElement.scrollTop += event.deltaY;
    };
    const startTouch = (event: TouchEvent) => {
      lastTouchY.current = event.touches[0]?.clientY ?? null;
    };
    const scrollTouch = (event: TouchEvent) => {
      const touchY = event.touches[0]?.clientY;
      if (touchY === undefined || lastTouchY.current === null) return;
      event.preventDefault();
      event.stopPropagation();
      listElement.scrollTop += lastTouchY.current - touchY;
      lastTouchY.current = touchY;
    };
    const endTouch = () => {
      lastTouchY.current = null;
    };

    listElement.addEventListener("wheel", scrollWheel, { passive: false });
    listElement.addEventListener("touchstart", startTouch, { passive: true });
    listElement.addEventListener("touchmove", scrollTouch, { passive: false });
    listElement.addEventListener("touchend", endTouch);
    listElement.addEventListener("touchcancel", endTouch);
    return () => {
      listElement.removeEventListener("wheel", scrollWheel);
      listElement.removeEventListener("touchstart", startTouch);
      listElement.removeEventListener("touchmove", scrollTouch);
      listElement.removeEventListener("touchend", endTouch);
      listElement.removeEventListener("touchcancel", endTouch);
    };
  }, [listElement]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn("h-11 w-full justify-between px-3.5 font-normal", className)}
        >
          <span className={cn("flex min-w-0 items-center gap-2", !selected && "text-muted")}>
            {selected?.icon}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-110 max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) overflow-hidden rounded-2xl bg-surface shadow-lg"
        >
          <Command className="w-full" loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <Command.Input
                placeholder={searchPlaceholder}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
            <Command.List
              ref={setListElement}
              className="max-h-[min(16rem,var(--radix-popover-content-available-height))] touch-pan-y overflow-y-auto overscroll-contain p-1.5"
            >
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
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-surface-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.icon}
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
