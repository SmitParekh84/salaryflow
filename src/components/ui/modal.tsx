"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import * as React from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const mounted = useHydrated();

  if (!mounted) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                data-slot="dialog-overlay"
                className="fixed inset-0 z-100 bg-black/60 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </DialogPrimitive.Overlay>
            <div className="pointer-events-none fixed inset-0 z-101 flex items-end justify-center sm:items-center sm:p-4">
              <DialogPrimitive.Content asChild onOpenAutoFocus={(event) => event.preventDefault()}>
                <motion.div
                  data-slot="dialog-content"
                  className={cn(
                    // iOS: the sheet is flush to the screen edges, so its top can
                    // reach under the status bar and its bottom under the home
                    // indicator. Both insets are 0 elsewhere. The sm: breakpoint
                    // resets them — there the sheet is centred with its own margin.
                    "pointer-events-auto relative flex max-h-[calc(100dvh-1rem-env(safe-area-inset-top))] w-full min-w-0 flex-col overflow-hidden rounded-t-[20px] bg-surface pb-[env(safe-area-inset-bottom)] text-foreground shadow-xl outline-none sm:max-h-[90vh] sm:max-w-lg sm:rounded-[20px] sm:pb-0",
                    className,
                  )}
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.98 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                >
                  {title && (
                    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
                      <DialogPrimitive.Title className="min-w-0 truncate text-base font-semibold sm:text-lg">
                        {title}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Close asChild>
                        <button
                          type="button"
                          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted outline-none hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-(--ring) sm:h-10 sm:w-10"
                          aria-label="Close"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </DialogPrimitive.Close>
                    </div>
                  )}
                  {!title && (
                    <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    {children}
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

export function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "sticky -bottom-4 z-10 -mx-4 -mb-4 mt-5 flex justify-end gap-3 border-t border-border bg-surface px-4 py-4 sm:-bottom-5 sm:-mx-5 sm:-mb-5 sm:px-5 [&_[data-slot=button]]:min-w-28",
        className,
      )}
      {...props}
    />
  );
}
