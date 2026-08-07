import Link from "next/link";

export const metadata = { title: "Offline — SalaryFlow" };

export default function Offline() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted">
        SalaryFlow works offline, but this page needs a connection. Your data is
        safe and will sync when you&apos;re back online.
      </p>
      <Link
        href="/dashboard"
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
