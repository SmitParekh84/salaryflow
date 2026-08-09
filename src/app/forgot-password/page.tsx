"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"send" | "verify">("send");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send reset code");
      setStep("verify");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to send code");
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Reset failed");
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-background flex min-h-dvh items-center justify-center px-5 py-10">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-4 text-2xl font-semibold tracking-[-0.02em]">Reset password</h1>
        {step === "send" ? (
          <form onSubmit={send} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </div>
            {error && <div role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</div>}
            <div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset code"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <div>
              <Label htmlFor="verify-email">Email</Label>
              <Input
                id="verify-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </div>
            <div>
              <Label htmlFor="reset-otp">Verification code</Label>
              <Input id="reset-otp" value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
              <p className="mt-2 text-xs text-muted">Use at least 12 characters.</p>
            </div>
            {error && <div role="alert" className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">{error}</div>}
            <div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Resetting…" : "Reset password"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
