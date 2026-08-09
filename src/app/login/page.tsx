"use client";

import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/useAuth";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, WalletCards } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // pass remember flag to login
      await login(email, password, remember);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(22rem,0.85fr)_minmax(30rem,1.15fr)]">
      <section className="hidden bg-foreground px-12 py-14 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <WalletCards className="h-5 w-5" />
          </span>
          SalaryFlow
        </div>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight">Your salary cycle, ready where you left it.</p>
          <div className="mt-10 space-y-6">
            <LoginStep number="1" title="Sign in securely" detail="Use the email linked to your account." />
            <LoginStep number="2" title="Sync your records" detail="Expenses, bills, goals and balances load together." />
            <LoginStep number="3" title="Continue this cycle" detail="See what is safe to spend today." />
          </div>
        </div>
        <p className="text-xs text-background/60">Private financial records stay tied to your account.</p>
      </section>

      <section className="flex min-h-dvh flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:items-center lg:justify-center lg:px-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none">
          <div className="flex items-center gap-2 text-sm font-semibold lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <WalletCards className="h-4 w-4" />
            </span>
            SalaryFlow
          </div>

          <div className="mt-10 lg:mt-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted lg:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">1</span>
              Sign in
              <span className="h-px flex-1 bg-border" />
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2">2</span>
              Sync
              <span className="h-px flex-1 bg-border" />
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2">3</span>
              Continue
            </div>
            <div className="mt-8 lg:mt-0">
              <p className="text-sm font-medium text-primary">Welcome back</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Sign in to your money</h1>
              <p className="mt-2 text-sm text-muted">Your latest salary cycle will be ready after a secure sync.</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="px-10"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary">
              Forgot password?
            </Link>
          </div>

          {error && <div role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</div>}
          <Button className="w-full" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign in securely"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
        <div className="mt-auto pt-8 text-center text-sm lg:mt-6 lg:pt-0">
          No account?{" "}
          <Link href="/register" className="font-medium text-primary">
            Create one
          </Link>
        </div>
        </div>
      </section>
    </main>
  );
}

function LoginStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/10 text-xs font-semibold">
        {number === "1" ? <Check className="h-4 w-4" /> : number}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-background/60">{detail}</p>
      </div>
    </div>
  );
}
