"use client";

import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Reset password</h1>
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
            {error && <div className="text-sm text-red-600">{error}</div>}
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
              />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Resetting…" : "Reset password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
