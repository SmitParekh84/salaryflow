"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { changePasswordSchema } from "@/lib/schemas";
import { useState } from "react";

/* ---------------------------------------------------------------------------
   Changing the password from inside a live session.

   Its own component rather than more inline JSX in settings-view.tsx, which is
   already long, and because it owns state nothing else on that screen wants:
   three secrets that must be cleared the moment they are no longer needed.
   --------------------------------------------------------------------------- */

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * `embedded` drops the heading and explanation, for when a sheet around it has
 * already said what this is. Three password boxes sitting open on the System
 * screen looked like something the app wanted, rather than something available
 * if you asked for it.
 */
export function ChangePasswordForm({ embedded = false }: { embedded?: boolean }) {
  const [draft, setDraft] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const set = (key: keyof typeof draft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
    setError("");
  };

  async function save() {
    if (draft.newPassword !== draft.confirmPassword) {
      setError("The two new passwords do not match.");
      return;
    }

    // The same schema the route validates against, so the common mistakes are
    // named here instead of costing a round trip to be told the same thing.
    const parsed = changePasswordSchema.safeParse({
      currentPassword: draft.currentPassword,
      newPassword: draft.newPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the details and try again.");
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("idle");
        setError(body?.error ?? "Could not change your password. Please try again.");
        return;
      }

      // Nothing keeps a password around after it has been used.
      setDraft(EMPTY);
      setStatus("saved");
    } catch {
      setStatus("idle");
      setError("Could not reach the server. Please try again.");
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {!embedded && (
        <div>
          <h3 className="text-sm font-semibold">Change password</h3>
          <p className="mt-1 text-xs text-muted">
            Your current password is needed to set a new one. Changing it signs you out everywhere
            else — this device stays signed in.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={draft.currentPassword}
            onChange={(event) => set("currentPassword", event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={draft.newPassword}
            onChange={(event) => set("newPassword", event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={draft.confirmPassword}
            onChange={(event) => set("confirmPassword", event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={status === "saving"}
          disabled={
            !draft.currentPassword || !draft.newPassword || !draft.confirmPassword
          }
        >
          Update password
        </Button>
        <p className="text-xs text-muted">Use at least 12 characters.</p>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      {status === "saved" ? (
        <p role="status" className="text-xs text-success">
          Password changed. Every other device has been signed out.
        </p>
      ) : null}
    </form>
  );
}
