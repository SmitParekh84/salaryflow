"use client";

import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import styles from "./landing.module.css";

/**
 * Email capture for the early-access list.
 *
 * Shared by the landing sections and the /waitlist page, so it lives beside the
 * nav and footer rather than inside the hero. Each instance takes its own `id`
 * because a page can render more than one, and two inputs sharing an id would
 * leave both labels pointing at the first.
 */
export function WaitlistForm({ id, compact = false }: { id: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to join the waitlist");
      setStatus("success");
      setMessage("You’re on the list. We’ll keep you posted.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to join the waitlist");
    }
  }

  return (
    <div className={compact ? styles.waitlistCompact : styles.waitlistBlock}>
      <form
        onSubmit={submit}
        className={styles.waitlistForm}
        aria-label={`Join the ${BRAND.name} waitlist`}
      >
        <label htmlFor={id} className="sr-only">
          Email address
        </label>
        <input
          id={id}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={status === "loading"}
        />
        <Button type="submit" size="lg" variant="marketing" loading={status === "loading"}>
          Join waitlist
          <ArrowRight />
        </Button>
      </form>
      <p
        className={`${styles.formMessage} ${status === "error" ? styles.formError : ""}`}
        role="status"
        aria-live="polite"
      >
        {message || "Early access updates only. No spam."}
      </p>
    </div>
  );
}
