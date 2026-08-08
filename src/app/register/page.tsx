"use client";

import { useFinanceStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const setUser = useFinanceStore((s) => s.updateUser);
  const syncWithServer = useFinanceStore((s: any) => s.syncWithServer);
  const router = useRouter();

  useEffect(() => {
    let t: number | undefined;
    if (resendTimer > 0) {
      t = window.setTimeout(() => setResendTimer((v) => v - 1), 1000);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [resendTimer]);

  function validateInputs() {
    if (!email) return "Email is required";
    if (!password || password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirm) return "Passwords do not match";
    return null;
  }

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const v = validateInputs();
    if (v) return setError(v);
    setLoadingSend(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to send OTP");
      }
      setCodeSent(true);
      setResendTimer(60);
    } catch (err: any) {
      setError(err?.message || "Unable to send OTP");
    } finally {
      setLoadingSend(false);
    }
  }

  async function verifyAndRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!codeSent) return setError("Please send OTP first");
    if (!otp || otp.length !== 6) return setError("Enter the 6-digit code");
    setLoadingVerify(true);
    try {
      const res = await fetch("/api/auth/verify-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp }),
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Registration failed");
      }
      const j = await res.json();
      const user = j?.data;
      if (user) {
        setUser({ name: user.name || "", email: user.email, onboarded: true });
        try {
          await syncWithServer?.();
        } catch (e) {}
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(err?.message || "Register failed");
    } finally {
      setLoadingVerify(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Create an account</h1>
        <form onSubmit={codeSent ? verifyAndRegister : sendOtp} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              type="email"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              type="password"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Confirm password</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              type="password"
            />
          </div>

          {codeSent && (
            <div>
              <label className="block text-sm mb-1">Verification code</label>
              <div className="flex gap-2">
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onPaste={(e) => {
                    const pastedCode = e.clipboardData
                      .getData("text")
                      .replace(/\D/g, "")
                      .slice(0, 6);
                    if (pastedCode) {
                      e.preventDefault();
                      setOtp(pastedCode);
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  className="w-full px-3 py-2 border rounded"
                />
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={resendTimer > 0 || loadingSend}
                  className="px-3 py-2 bg-transparent border rounded text-sm"
                >
                  {resendTimer > 0 ? `Resend (${resendTimer}s)` : "Resend"}
                </button>
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 text-white rounded"
              disabled={loadingSend || loadingVerify}
            >
              {codeSent
                ? loadingVerify
                  ? "Verifying…"
                  : "Verify & Create account"
                : loadingSend
                  ? "Sending…"
                  : "Send verification code"}
            </button>
          </div>
        </form>
        <div className="mt-4 text-sm text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
