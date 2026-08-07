"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/useAuth";

export default function LoginStep({ onBeforeLogin }: { onBeforeLogin?: () => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (onBeforeLogin) await onBeforeLogin();
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </div>
      <div>
        <Label>Password</Label>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div>
        <Button className="w-full" disabled={loading}>{loading ? "Signing…" : "Sign in"}</Button>
      </div>
    </form>
  );
}
