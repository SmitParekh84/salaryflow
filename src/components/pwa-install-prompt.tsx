"use client";

import { usePwaInstall } from "@/lib/usePwaInstall";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, Smartphone, X } from "lucide-react";
import { useState } from "react";

/**
 * Landing-page PWA install section.
 * - Android / Chrome / Edge: shows a "Install app" button that triggers the
 *   native browser prompt (beforeinstallprompt).
 * - iOS (iPhone / iPad): Safari does not support beforeinstallprompt at all.
 *   We detect iOS and show a step-by-step "Add to Home Screen" guide instead.
 * - Already installed or server render: renders nothing.
 */
export function PwaInstallSection() {
  const { canInstallNatively, isInstalled, platform, promptInstall } = usePwaInstall();
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Don't render anything on server (platform is null) or when already installed
  if (platform === null || isInstalled) return null;
  // On desktop, only show if the native prompt is available
  if (platform === "desktop" && !canInstallNatively) return null;

  async function handleAndroidInstall() {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className="pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-xl"
      >
        <div className="rounded-3xl border border-border bg-surface/70 p-7 text-center backdrop-blur card-shadow">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Add Aartha to your home screen</h2>
          <p className="mt-2 text-sm text-muted">
            Install the app for instant access, offline support, and a native feel — no App Store
            required.
          </p>

          <div className="mt-6">
            {(platform === "android" || platform === "desktop") && canInstallNatively ? (
              <button
                onClick={handleAndroidInstall}
                disabled={installing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {installing ? "Opening installer…" : "Install app"}
              </button>
            ) : platform === "ios" ? (
              <button
                onClick={() => setIosGuideOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
              >
                <Share className="h-4 w-4" />
                How to install on iPhone / iPad
              </button>
            ) : null}
          </div>

          {/* Platform badges */}
          <p className="mt-4 text-xs text-muted/70">
            {platform === "ios"
              ? "Works on iPhone & iPad via Safari"
              : "Works on Android, Chrome & Edge"}
          </p>
        </div>
      </motion.div>

      {/* iOS step-by-step guide modal */}
      <AnimatePresence>
        {iosGuideOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setIosGuideOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] card-shadow"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Add to Home Screen</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    Follow these steps in Safari on your iPhone or iPad.
                  </p>
                </div>
                <button
                  onClick={() => setIosGuideOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ol className="space-y-4">
                <IosStep number={1}>
                  Open this page in{" "}
                  <strong className="font-semibold text-foreground">Safari</strong> (not Chrome or
                  Firefox — iOS only allows home-screen install from Safari).
                </IosStep>
                <IosStep number={2}>
                  Tap the{" "}
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Share className="inline h-3.5 w-3.5 -mt-0.5" /> Share
                  </span>{" "}
                  button at the bottom centre of the screen (the box with an upward arrow).
                </IosStep>
                <IosStep number={3}>
                  Scroll down in the share sheet and tap{" "}
                  <strong className="font-semibold text-foreground">Add to Home Screen</strong>.
                </IosStep>
                <IosStep number={4}>
                  Tap <strong className="font-semibold text-foreground">Add</strong> in the top
                  right corner. Aartha will appear on your home screen instantly.
                </IosStep>
              </ol>

              <div className="mt-6 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
                <strong className="font-medium text-foreground">Why Safari?</strong> Apple restricts
                the &ldquo;Add to Home Screen&rdquo; PWA feature to Safari only on iOS. Chrome,
                Firefox, and other iOS browsers cannot install apps to the home screen.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

function IosStep({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        {number}
      </span>
      <p className="text-sm text-muted leading-relaxed">{children}</p>
    </li>
  );
}
