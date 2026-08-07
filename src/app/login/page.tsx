"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // pass remember flag to login
      await login(email, password, remember);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Sign in to SalaryFlow</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" type="email" />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" type="password" />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4" />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-sm text-blue-600">Forgot password?</Link>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
        <div className="mt-4 text-sm text-center">
          No account? <Link href="/register" className="text-blue-600">Create one</Link>
        </div>
      </div>
    </div>
  );
}
