"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import React, { useState } from "react";

type AccountMode = "email" | "login" | "register";

interface LoginStepProps {
  name: string;
  onAuthenticated: (user: { email: string; name?: string }) => Promise<void>;
}

export default function LoginStep({ name, onAuthenticated }: LoginStepProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<AccountMode>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(json?.error || "Unable to check this email");

      setEmail(normalizedEmail);
      setMode(json?.data?.exists ? "login" : "register");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to check this email");
    } finally {
      setLoading(false);
    }
  }

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
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
    setConfirmPassword("");
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
          {loading ? "Checking…" : "Continue"}
        </Button>
      </form>
    );
  }

  const isRegistration = mode === "register";

  return (
    <form onSubmit={authenticate} className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-xs text-muted">
            {isRegistration ? "New account" : "Existing account"}
          </p>
        </div>
        <button
          type="button"
          onClick={changeEmail}
          className="text-xs font-medium text-primary hover:underline"
        >
          Change
        </button>
      </div>

      <div>
        <Label htmlFor="onboarding-password">
          {isRegistration ? "Create password" : "Password"}
        </Label>
        <div className="relative">
          <Input
            id="onboarding-password"
            autoFocus
            autoComplete={isRegistration ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            className="pr-11"
            minLength={isRegistration ? 6 : 1}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isRegistration && (
        <div>
          <Label htmlFor="onboarding-confirm-password">Confirm password</Label>
          <Input
            id="onboarding-confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type={showPassword ? "text" : "password"}
            minLength={6}
            required
          />
          <p className="mt-2 text-xs text-muted">Use at least 6 characters.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading || !password}>
        {loading
          ? "Saving your setup…"
          : isRegistration
            ? "Create account & finish"
            : "Sign in & finish"}
      </Button>

      <button
        type="button"
        onClick={changeEmail}
        className="mx-auto flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to email
      </button>
    </form>
  );
}
