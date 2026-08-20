"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";
import { useFinanceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Info, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "model";
  text: string;
  savedFacts?: string[];
};

const STARTERS = [
  "Do I need term insurance?",
  "Am I saving enough each month?",
  "Where is most of my money going?",
  "Can I afford an EMI right now?",
];

/** Field name to something a person would recognise in a "saved" chip. */
const FACT_LABELS: Record<string, string> = {
  age: "your age",
  dependents: "dependents",
  existingLifeCover: "existing life cover",
  existingHealthCover: "existing health cover",
  outstandingLoans: "outstanding loans",
  spouseIncome: "spouse income",
};

export function AssistantView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const navMode = useFinanceStore((state) => state.user.navMode ?? "bottom");
  // The tab bar's height, taken from the bar itself; nothing sits at the bottom
  // in hamburger mode, and the bar is hidden from `lg` up.
  const bottomOffset = navMode === "bottom" ? "calc(4rem + env(safe-area-inset-bottom))" : "0px";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body) => {
        if (!cancelled) setMessages(body.data ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;

    setError(null);
    setDraft("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "model", text: body.data.reply, savedFacts: body.data.savedFacts },
      ]);
    } catch {
      setError("Could not reach the assistant. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const empty = loaded && messages.length === 0;

  return (
    /*
     * One scroll surface, not two.
     *
     * This used to be a fixed `h-[calc(100dvh-9rem)]` column with its own
     * scrolling log. The 9rem was a guess at the app chrome, and it was wrong:
     * `main` already reserves the top bar plus `calc(5rem + safe-area)` at the
     * bottom for the tab bar, so the guessed height was *added* to that padding
     * and the page overflowed by exactly the difference — the whole page
     * scrolled behind an inner scroller, and the send row sat 14px underneath
     * the tab bar. Now the page scrolls, and the composer sticks above whatever
     * the current nav mode puts at the bottom of the screen.
     */
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <header className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <Sparkles className="size-5 text-primary" aria-hidden />
          {BRAND.assistantName}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ask about your money. Answers use your own salary, spending, bills and investments.
        </p>
      </header>

      <div className="space-y-4 pb-4" role="log" aria-live="polite" aria-label="Conversation">
        {empty ? (
          <div className="rounded-2xl border border-border bg-surface/60 p-5">
            <p className="text-sm font-medium text-foreground">Not sure where to start?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => send(starter)}
                  className="rounded-full bg-surface-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-(--ring) outline-none"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {sending ? (
          <div className="flex items-center gap-2 text-sm text-muted" aria-label="Thinking">
            <span className="size-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
            <span className="size-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
            <span className="size-2 animate-bounce rounded-full bg-muted" />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      {/*
       * Sticks above the bottom bar rather than at the viewport edge, which
       * would put it behind one. The offset is the tab bar's own height — the
       * same expression the bar itself uses — and zero when the user has
       * switched to the hamburger nav, which has no bottom bar.
       */}
      <div
        className="sticky bottom-(--composer-offset) z-10 -mx-4 border-t border-border bg-background/90 px-4 pb-3 pt-3 backdrop-blur-xl lg:mx-0 lg:bottom-0 lg:px-0"
        style={{ "--composer-offset": bottomOffset } as React.CSSProperties}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2"
        >
          <label className="sr-only" htmlFor="assistant-input">
            Your question
          </label>
          <Textarea
            id="assistant-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter makes a new line — the convention
              // people already expect from every other chat box.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask anything about your money…"
            rows={1}
            maxLength={2000}
            className="min-h-11 flex-1 resize-none py-3"
          />
          <Button type="submit" size="icon" loading={sending} disabled={!draft.trim()}>
            <Send className="size-4" aria-hidden />
            <span className="sr-only">Send</span>
          </Button>
        </form>

        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
          General guidance only, not licensed financial advice. Check anything important with a
          qualified adviser before acting on it.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-2", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-surface/60 text-foreground",
          )}
        >
          {message.text}
        </div>

        {message.savedFacts?.length ? (
          <p className="text-xs text-muted">
            Saved to your profile: {message.savedFacts.map((f) => FACT_LABELS[f] ?? f).join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
