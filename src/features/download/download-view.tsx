"use client";

import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { usePwaInstall, type PwaPlatform } from "@/lib/usePwaInstall";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Download,
  MonitorSmartphone,
  Share,
  Smartphone,
  WifiOff,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Guide = { id: Exclude<PwaPlatform, null>; label: string; browser: string; steps: string[] };

/**
 * Steps are written as what the user sees on screen, not as feature names —
 * "tap the Share button" is followable; "invoke the share sheet" is not.
 */
const GUIDES: Guide[] = [
  {
    id: "ios",
    label: "iPhone & iPad",
    browser: "Safari",
    steps: [
      "Open Spendly in Safari. Chrome and Firefox on iOS cannot install apps — Apple restricts it.",
      "Tap the Share button in the toolbar.",
      "Scroll down and choose Add to Home Screen.",
      "Tap Add. Spendly appears on your home screen.",
    ],
  },
  {
    id: "android",
    label: "Android",
    browser: "Chrome",
    steps: [
      "Tap Install app below. If nothing happens, open the ⋮ menu in Chrome.",
      "Choose Install app, or Add to Home screen.",
      "Confirm Install.",
    ],
  },
  {
    id: "desktop",
    label: "Desktop",
    browser: "Chrome or Edge",
    steps: [
      "Click Install app below, or the install icon at the right of the address bar.",
      "If you don't see it, open the ⋮ menu and choose Install Spendly.",
      "Confirm Install. Spendly opens in its own window.",
    ],
  },
];

const BENEFITS = [
  { icon: Zap, title: "Opens instantly", body: "Launches from your home screen like any other app." },
  { icon: WifiOff, title: "Works offline", body: "Check what's safe to spend without a connection." },
  {
    icon: MonitorSmartphone,
    title: "No app store",
    body: "Installs straight from the browser. No account with Apple or Google needed.",
  },
];

export function DownloadView() {
  const { canInstallNatively, isInstalled, platform, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [override, setOverride] = useState<Exclude<PwaPlatform, null> | null>(null);

  // Derived rather than synced in an effect: `platform` is null until hydration,
  // so this falls back to iOS for the server render and switches to the detected
  // platform on the client. An explicit tap always wins, because someone may open
  // this page on a laptop to read the iPhone steps.
  const active = override ?? platform ?? "ios";
  const guide = GUIDES.find((entry) => entry.id === active) ?? GUIDES[0];

  async function handleInstall() {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>

        <header className="mt-6 flex flex-col items-center text-center">
          <BrandMark size="lg" />
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Install Spendly</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Spendly installs straight from your browser — it takes about ten seconds and works on
            every phone.
          </p>
        </header>

        {isInstalled ? (
          // A page called "download" that a user reaches from an installed app
          // should confirm that, not silently offer to install it again.
          <div className="mt-8 rounded-2xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-success/10">
              <Check className="size-5 text-success" aria-hidden="true" />
            </div>
            <h2 className="mt-3 font-semibold">Spendly is already installed</h2>
            <p className="mt-1.5 text-sm text-muted">You&rsquo;re running the installed app.</p>
            <Button asChild className="mt-5">
              <Link href="/dashboard">Open Spendly</Link>
            </Button>
          </div>
        ) : (
          <>
            {canInstallNatively && (
              <div className="mt-8 rounded-2xl border border-border bg-surface p-6 text-center">
                <p className="text-sm text-muted">Your browser can install Spendly directly.</p>
                <Button onClick={handleInstall} loading={installing} size="lg" className="mt-4">
                  <Download className="size-4" aria-hidden="true" />
                  Install app
                </Button>
              </div>
            )}

            <section className="mt-8">
              <div
                role="tablist"
                aria-label="Choose your device"
                className="flex gap-1 rounded-xl bg-surface-2 p-1"
              >
                {GUIDES.map((entry) => {
                  const selected = entry.id === active;
                  return (
                    <button
                      key={entry.id}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => setOverride(entry.id)}
                      className={cn(
                        "min-h-10 flex-1 rounded-lg px-2 text-xs font-medium transition-colors duration-150 active:scale-[0.98]",
                        selected
                          ? "bg-surface text-foreground card-shadow"
                          : "text-muted hover:text-foreground",
                      )}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
                  {guide.id === "ios" ? (
                    <Share className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Smartphone className="size-3.5" aria-hidden="true" />
                  )}
                  Using {guide.browser}
                </p>
                <ol className="mt-4 space-y-4">
                  {guide.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-surface p-4">
              <Icon className="size-4 text-primary" aria-hidden="true" />
              <h3 className="mt-2.5 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </section>

        <p className="mt-8 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
