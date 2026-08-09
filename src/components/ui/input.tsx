import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    data-slot="input"
    ref={ref}
    className={cn(
      "h-11 w-full min-w-0 rounded-xl border border-transparent bg-surface-2 px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] placeholder:text-muted focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-default read-only:bg-surface",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => (
  <input
    data-slot="checkbox"
    ref={ref}
    type="checkbox"
    className={cn(
      "h-4 w-4 shrink-0 cursor-pointer rounded border border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    data-slot="native-select"
    ref={ref}
    className={cn(
      "h-11 w-full min-w-0 rounded-xl border border-transparent bg-surface-2 px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    data-slot="textarea"
    ref={ref}
    className={cn(
      "min-h-20 w-full min-w-0 resize-y rounded-xl border border-transparent bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "mb-1.5 block text-xs font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
