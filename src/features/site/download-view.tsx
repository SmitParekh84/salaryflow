"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { BRAND } from "@/lib/brand";
import { usePwaInstall, type PwaPlatform } from "@/lib/usePwaInstall";
import { Check, Download, MonitorSmartphone, WifiOff, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DemoButton } from "./demo-button";
import styles from "./site.module.css";
import { Rise, SectionPage } from "./site-shell";

type Guide = { id: Exclude<PwaPlatform, null>; label: string; browser: string; steps: string[] };

/**
 * Install instructions.
 *
 * Steps are written as what the user sees on screen, not as feature names —
 * "tap the Share button" is followable; "invoke the share sheet" is not. The
 * copy is carried over unchanged from the previous version of this page; only
 * the styling and the shell moved.
 */
const GUIDES: Guide[] = [
  {
    id: "ios",
    label: "iPhone & iPad",
    browser: "Safari",
    steps: [
      "Open Aartha in Safari. Chrome and Firefox on iOS cannot install apps, because Apple restricts it.",
      "Tap the Share button in the toolbar.",
      "Scroll down and choose Add to Home Screen.",
      "Tap Add. Aartha appears on your home screen.",
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
      "If you don't see it, open the ⋮ menu and choose Install Aartha.",
      "Confirm Install. Aartha opens in its own window.",
    ],
  },
];

const BENEFITS = [
  {
    Icon: Zap,
    title: "Opens instantly",
    body: "Launches from your home screen like any other app, with no browser chrome in the way.",
  },
  {
    Icon: WifiOff,
    title: "Works offline",
    body: "Check what is safe to spend with no connection at all, on a train or in a basement.",
  },
  {
    Icon: MonitorSmartphone,
    title: "No app store",
    body: "Installs straight from the browser. No account with Apple or Google, and nothing to download from a store.",
  },
];

export function DownloadView() {
  const { canInstallNatively, isInstalled, platform, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [override, setOverride] = useState<Exclude<PwaPlatform, null> | null>(null);

  // Derived rather than synced in an effect: `platform` is null until hydration,
  // so this falls back to iOS for the server render and switches to the detected
  // platform on the client. An explicit tap always wins, because someone may
  // open this page on a laptop to read the iPhone steps.
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
    <SectionPage
      hero={{
        eyebrow: "Install the app",
        title: (
          <>
            {BRAND.name} on your <span className={styles.accentWord}>home screen.</span>
          </>
        ),
        lede: `${BRAND.name} installs straight from your browser. It takes about ten seconds, works on every phone, and there is no app store in the way.`,
      }}
    >
      <Rise className={`${styles.section} ${styles.band}`} as="section">
        {isInstalled ? (
          <div className={`${styles.proseNote} ${styles.reveal}`} data-rise style={{ marginTop: 0 }}>
            <p>
              <Check aria-hidden style={{ display: "inline", height: 15, width: 15, verticalAlign: "-2px", color: "var(--accent)" }} />{" "}
              You are running the installed app. Nothing more to do.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.reveal} data-rise>
              <SegmentedControl
                value={active}
                onValueChange={setOverride}
                items={GUIDES.map((entry) => ({ value: entry.id, label: entry.label }))}
                label="Choose your device"
                tone="marketing"
              />
            </div>

            <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise style={{ marginTop: 30 }}>
              {guide.label} &middot; {guide.browser}
            </p>

            <ol className={`${styles.steps} ${styles.reveal}`} data-rise style={{ marginTop: 16 }}>
              {guide.steps.map((step) => (
                <li key={step}>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {/* Only offered where the browser can actually honour it. A button
                that silently does nothing is worse than no button. */}
            {canInstallNatively ? (
              <div className={styles.reveal} data-rise style={{ marginTop: 28 }}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={handleInstall}
                  disabled={installing}
                >
                  <Download aria-hidden />
                  {installing ? "Installing…" : "Install app"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </Rise>

      <Rise className={styles.section} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            Why install it
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
            It is the same app either way.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            Installed, it just behaves like one.
          </p>
        </div>

        <div className={styles.cardGrid}>
          {BENEFITS.map(({ Icon, title, body }) => (
            <div key={title} className={`${styles.cardCell} ${styles.reveal}`} data-rise>
              <Icon aria-hidden />
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>

        <div className={`${styles.heroActions} ${styles.reveal}`} data-rise style={{ marginTop: 34 }}>
          <DemoButton />
          <Link href="/waitlist" className={styles.btnQuiet}>
            Join the waitlist
          </Link>
        </div>
      </Rise>
    </SectionPage>
  );
}
