import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    data-slot="input"
    ref={ref}
    className={cn(
      // text-base below `sm`: iOS Safari zooms the page into any field under 16px.
      "h-11 w-full min-w-0 rounded-xl border border-transparent bg-surface-2 px-3 text-base text-foreground outline-none transition-[color,box-shadow,border-color] placeholder:text-muted focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-60 read-only:cursor-default read-only:bg-surface sm:text-sm",
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

type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "defaultValue" | "onChange" | "size"
> & {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
};

type SelectOption = { value: string; label: React.ReactNode; disabled: boolean };

function readSelectOptions(children: React.ReactNode): SelectOption[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return [];
    if (child.type !== "option") return [];
    const inferredValue =
      typeof child.props.children === "string" || typeof child.props.children === "number"
        ? String(child.props.children)
        : "";
    return [
      {
        value: String(child.props.value ?? inferredValue),
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
      },
    ];
  });
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      children,
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      id,
      disabled,
      required,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const options = readSelectOptions(children);
    const placeholder = options.find((option) => option.value === "")?.label;
    const [internalValue, setInternalValue] = React.useState(String(defaultValue ?? ""));
    const selectedValue = value === undefined ? internalValue : String(value);

    const selectTarget = (nextValue: string) =>
      ({ value: nextValue, name: name ?? "", id: id ?? "" }) as HTMLSelectElement;

    const notifyChange = (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue);
      const target = selectTarget(nextValue);
      onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
    };

    return (
      <SelectPrimitive.Root
        value={selectedValue}
        onValueChange={notifyChange}
        name={name}
        disabled={disabled}
        required={required}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          id={id}
          data-slot="select-trigger"
          aria-label={ariaLabel}
          onBlur={() => {
            const target = selectTarget(selectedValue);
            onBlur?.({ target, currentTarget: target } as React.FocusEvent<HTMLSelectElement>);
          }}
          className={cn(
            "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-transparent bg-surface-2 px-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] data-placeholder:text-muted focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-60 [&>span]:min-w-0 [&>span]:truncate",
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            data-slot="select-content"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className="z-110 max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-(--radix-select-trigger-width) overflow-hidden rounded-2xl bg-surface text-foreground card-shadow"
          >
            <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center text-muted">
              <ChevronUp className="h-4 w-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="max-h-[min(18rem,var(--radix-select-content-available-height))] touch-pan-y overflow-y-auto overscroll-contain p-1.5">
              {options
                .filter((option) => option.value !== "")
                .map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="relative flex min-h-10 cursor-default select-none items-center rounded-xl py-2 pl-9 pr-3 text-sm outline-none data-disabled:pointer-events-none data-highlighted:bg-surface-2 data-disabled:opacity-50"
                  >
                    <span className="absolute left-3 flex h-4 w-4 items-center justify-center text-primary">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center text-muted">
              <ChevronDown className="h-4 w-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  },
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    data-slot="textarea"
    ref={ref}
    className={cn(
      "min-h-20 w-full min-w-0 resize-y rounded-xl border border-transparent bg-surface-2 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm",
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
