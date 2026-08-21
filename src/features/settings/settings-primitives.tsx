import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/**
 * Layout primitives for the settings surface.
 *
 * Lifted out of settings-view.tsx when the profile section moved into a file of
 * its own — two consumers means these can no longer be private to one of them.
 * They are pure layout: no data, no state, no knowledge of which section is
 * rendering them, which is what makes a new section cheap to add.
 */

export function SettingsPane({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/*
       * Desktop only. On a phone this header repeated the title already in the
       * top bar and then spent three lines describing a screen the user is
       * looking at — the first thing between them and the settings they came
       * for. The section list on the way in carries the same description.
       */}
      <header className="hidden border-b border-border py-4 lg:block lg:px-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </header>
      <div className="space-y-5 py-1 lg:space-y-5 lg:p-6">{children}</div>
    </div>
  );
}

/**
 * One setting, as a row: what it is on the left, what it is set to on the
 * right, and a chevron if tapping opens something.
 *
 * A pane used to be a column of full-width input boxes, so a screen showed four
 * settings and nothing else — you could not see what a section contained
 * without scrolling it. A row states the current value, which is the thing
 * being looked for most of the time, and keeps the input out of sight until it
 * is actually wanted.
 */
export function SettingRow({
  label,
  value,
  onClick,
  icon: Icon,
  danger,
}: {
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  danger?: boolean;
}) {
  const body = (
    <>
      {Icon && <Icon className={cn("h-4 w-4 shrink-0", danger ? "text-danger" : "text-muted")} />}
      <span className={cn("min-w-0 flex-1 text-sm", danger && "text-danger")}>{label}</span>
      {value !== undefined && (
        <span className="max-w-[45%] truncate text-sm text-muted">{value}</span>
      )}
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
    </>
  );

  if (!onClick) {
    return <div className="flex min-h-12 items-center gap-3 px-4 py-3">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors active:bg-surface-2/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--ring)"
    >
      {body}
    </button>
  );
}

/** A card of `SettingRow`s, divided like a phone settings list. */
export function SettingRows({
  title,
  footnote,
  children,
}: {
  title?: string;
  footnote?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      {title && (
        <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </h3>
      )}
      {/* Card on a phone, plain divided list on desktop — see SettingsGroup. */}
      <div className="overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow)] lg:rounded-none lg:border-y lg:border-border lg:bg-transparent lg:shadow-none">
        <div className="divide-y divide-border">{children}</div>
      </div>
      {footnote && <p className="px-1 text-[11px] leading-relaxed text-muted">{footnote}</p>}
    </section>
  );
}

/**
 * One set of related settings.
 *
 * A phone showed every pane as one undifferentiated column of full-width
 * fields — nine labels and nine boxes with nothing saying which belonged
 * together, so finding "currency" meant reading all of them. Grouping them into
 * titled cards is the convention every phone settings app uses, and it gives the
 * eye somewhere to stop.
 *
 * Cards on a phone only: from `lg` the pane already sits on its own surface, and
 * a card on a card draws a boundary nobody can see.
 */
export function SettingsGroup({
  title,
  footnote,
  children,
}: {
  title?: string;
  /** Group-level note, set below the card the way a phone settings screen does. */
  footnote?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      {title && (
        <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted lg:px-0">
          {title}
        </h3>
      )}
      {/*
       * `shadow-[var(--shadow)]` rather than the `card-shadow` class: that one
       * lives outside Tailwind's layers, so a `lg:` variant cannot switch it off
       * and the card kept its shadow on desktop with nothing behind it to cast
       * one. Same shadow, expressed as a utility that responds to breakpoints.
       */}
      <div className="space-y-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow)] lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
        {children}
      </div>
      {footnote && (
        <p className="px-1 text-[11px] leading-relaxed text-muted lg:px-0">{footnote}</p>
      )}
    </section>
  );
}

export function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted transition-colors group-hover:text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
