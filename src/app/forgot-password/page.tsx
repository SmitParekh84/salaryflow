"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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
      const res = await fetch("/api/auth/send-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error("Failed to send reset code");
      setStep("verify");
    } catch (err: any) {
      setError(err?.message || "Unable to send code");
    } finally { setLoading(false); }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp, password }), credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Reset failed");
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Reset failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Reset password</h1>
        {step === "send" ? (
          <form onSubmit={send} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" type="email" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? "Sending…" : "Send reset code"}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" type="email" />
            </div>
            <div>
              <label className="block text-sm mb-1">Verification code</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">New password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" type="password" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div>
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded" disabled={loading}>{loading ? "Resetting…" : "Reset password"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
