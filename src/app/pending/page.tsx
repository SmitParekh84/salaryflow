import { BRAND } from "@/lib/brand";
import { Clock3, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Waiting for approval",
  // Not indexable: it is a transient state for one person, and it would rank for
  // the brand name while telling a stranger nothing.
  robots: { index: false, follow: false },
};

/**
 * Where a new signup lands.
 *
 * Registration creates the account and stops — no session is issued until an
 * admin approves it — so this page exists to make that wait legible rather than
 * leaving the reader on a form that appeared to succeed and went nowhere.
 *
 * Deliberately has no "resend", no "check status" button and no polling. There
 * is nothing the reader can do to move the decision along, and a button that
 * only ever says "still waiting" invites pressing it. What it does give them is
 * the sequence, so the silence is expected rather than a failure, and a way back
 * to the site so this is not a dead end.
 *
 * A server component with no state: nothing here depends on who the reader is,
 * which also means it renders correctly for someone arriving from an email link
 * days later with no session at all.
 */
export default function PendingApproval() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-primary">
        <Clock3 className="h-7 w-7" aria-hidden />
      </span>

      <div className="flex max-w-md flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Your account is being reviewed</h1>
        <p className="text-sm leading-relaxed text-muted">
          Thanks for signing up. {BRAND.name} is invite-only while it is in early access, so a
          person checks each new account before it is opened.
        </p>
      </div>

      <ol className="flex w-full max-w-md flex-col gap-3 text-left">
        <li className="flex items-start gap-3 rounded-xl border border-border p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="text-sm">
            <span className="font-medium">Email verified.</span>{" "}
            <span className="text-muted">Your address is confirmed and your account exists.</span>
          </span>
        </li>
        <li className="flex items-start gap-3 rounded-xl border border-border p-4">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
          <span className="text-sm">
            <span className="font-medium">Waiting for approval.</span>{" "}
            <span className="text-muted">Usually within a day. Nothing is needed from you.</span>
          </span>
        </li>
        <li className="flex items-start gap-3 rounded-xl border border-border p-4">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
          <span className="text-sm">
            <span className="font-medium">We email you either way.</span>{" "}
            <span className="text-muted">
              Once approved, sign in with the password you just chose.
            </span>
          </span>
        </li>
      </ol>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link href="/" className="font-medium text-primary">
          Back to {BRAND.name}
        </Link>
        {/* Kept for the reader who was approved days ago, still has this page
            open, and wants somewhere to go other than the browser back button. */}
        <Link href="/login" className="text-muted">
          Already approved? Sign in
        </Link>
      </div>
    </main>
  );
}
