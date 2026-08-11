"use client";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Console sign-in.
 *
 * Deliberately plain: no marketing, no sign-up link, no password reset. This is
 * operator tooling, and every extra affordance here is another door on a surface
 * that manages other people's accounts.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || "Sign-in failed");
        return;
      }
      // The gate reads the cookie server-side, so a refresh is what promotes the
      // new session — `replace` also keeps the login page out of history.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" />
          <h1 className="mt-4 flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
            <Shield className="size-4 text-muted" aria-hidden="true" />
            Aartha Console
          </h1>
          <p className="mt-1.5 text-sm text-muted">Operator access only.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface p-5">
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className="mt-5 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          This console manages the Aartha app. It is not a user account.
        </p>
      </div>
    </main>
  );
}
