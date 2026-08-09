"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

type AccountMode = "email" | "login";

interface LoginStepProps {
  name: string;
  onAuthenticated: (user: { email: string; name?: string }) => Promise<void>;
}

export default function LoginStep({ name, onAuthenticated }: LoginStepProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AccountMode>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmail(email.trim().toLowerCase());
    setMode("login");
  }

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name, remember: true }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(json?.error || "Unable to continue");

      await onAuthenticated({ email: json.data.email, name: json.data.name });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  }

  function changeEmail() {
    setMode("email");
    setPassword("");
    setError(null);
  }

  if (mode === "email") {
    return (
      <form onSubmit={checkEmail} className="space-y-4">
        <div>
          <Label htmlFor="onboarding-email">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="onboarding-email"
              autoFocus
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              required
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            We’ll check whether you already have an account.
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
          Continue to sign in
        </Button>
        <Button asChild type="button" variant="secondary" className="w-full">
          <Link href="/register">Create a verified account</Link>
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={authenticate} className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-xs text-muted">Secure account sign in</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={changeEmail}
          className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:underline"
        >
          Change
        </Button>
      </div>

      <div>
        <Label htmlFor="onboarding-password">Password</Label>
        <div className="relative">
          <Input
            id="onboarding-password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            className="pr-11"
            minLength={1}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted hover:bg-surface hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading || !password}>
        {loading ? "Signing in…" : "Sign in & finish"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={changeEmail}
        className="mx-auto text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to email
      </Button>
    </form>
  );
}
