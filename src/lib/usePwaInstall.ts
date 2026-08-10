"use client";

import { useEffect, useState } from "react";

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

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect standalone (installed) mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).standalone === true;
    setIsInstalled(standalone);

    // Detect platform
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    if (isIos) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else setPlatform("desktop");

    // Capture Android/Chrome/Edge deferred install prompt
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Clear prompt if app gets installed
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

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
