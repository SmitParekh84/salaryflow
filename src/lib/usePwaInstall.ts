"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type PwaPlatform = "android" | "ios" | "desktop" | null;

interface PwaInstallState {
  /** Can we trigger the native Android/Chrome/Edge install prompt? */
  canInstallNatively: boolean;
  /** Is the app already running in standalone / installed mode? */
  isInstalled: boolean;
  /** Best-guess platform for showing install instructions */
  platform: PwaPlatform;
  /** Trigger the native browser install prompt (Android/Chrome/Edge only) */
  promptInstall: () => Promise<void>;
}

// Extend window for the deferred prompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISPLAY_MODE_QUERY = "(display-mode: standalone)";

/** Subscribes to the only thing that can change standalone mode at runtime. */
function subscribeDisplayMode(onChange: () => void) {
  const query = window.matchMedia(DISPLAY_MODE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia(DISPLAY_MODE_QUERY).matches ||
    // iOS Safari predates the display-mode media query and reports it here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

/** The platform never changes for the life of the document. */
function subscribePlatform() {
  return () => {};
}

function getPlatformSnapshot(): PwaPlatform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedThisSession, setInstalledThisSession] = useState(false);

  // Both values are read from the browser rather than assigned during an effect.
  // Writing them with setState in an effect body caused a cascading render on
  // every mount, and React flags it for that reason; useSyncExternalStore is the
  // supported way to read from an external system. The server snapshots keep SSR
  // and the first hydration render in agreement — React then re-renders with the
  // real client value, so there is no hydration mismatch.
  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    getStandaloneSnapshot,
    () => false,
  );
  const platform = useSyncExternalStore(subscribePlatform, getPlatformSnapshot, () => null);

  useEffect(() => {
    // Capture Android/Chrome/Edge deferred install prompt
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // `appinstalled` fires before the display mode flips — often not until the
    // next launch — so it is tracked separately rather than read from matchMedia.
    const onAppInstalled = () => {
      setInstalledThisSession(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const isInstalled = standalone || installedThisSession;

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return {
    canInstallNatively: deferredPrompt !== null,
    isInstalled,
    platform,
    promptInstall,
  };
}
