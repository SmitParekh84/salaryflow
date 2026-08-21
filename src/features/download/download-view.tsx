"use client";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import landing from "@/features/landing/landing.module.css";
import { Reveal, SectionHeading } from "@/features/landing/section";
import { MarketingPage, PageCta, PageHero } from "@/features/marketing/marketing-page";
import styles from "@/features/marketing/marketing-page.module.css";
import { BRAND } from "@/lib/brand";
import { usePwaInstall, type PwaPlatform } from "@/lib/usePwaInstall";
import { ArrowRight, Check, Download, MonitorSmartphone, Share, Smartphone, WifiOff, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Guide = { id: Exclude<PwaPlatform, null>; label: string; browser: string; steps: string[] };

/**
 * Steps are written as what the user sees on screen, not as feature names -
 * "tap the Share button" is followable; "invoke the share sheet" is not.
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
    icon: Zap,
    title: "Opens instantly",
    body: "Launches from your home screen like any other app, with no browser chrome in the way.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    body: "Check what is safe to spend with no connection at all, on a train or in a basement.",
  },
  {
    icon: MonitorSmartphone,
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
    <MarketingPage>
      <PageHero
        eyebrow="Install the app"
        title={
          <>
            {BRAND.name} on your <span>home screen.</span>
          </>
        }
        lede={`${BRAND.name} installs straight from your browser. It takes about ten seconds, works on every phone, and there is no app store in the way.`}
      />

      <section className={landing.section}>
        {isInstalled ? (
          // A page called "download" that a user reaches from an installed app
          // should confirm that, not silently offer to install it again.
          <Reveal className={styles.installed}>
            <Check />
            <h2>{BRAND.name} is already installed</h2>
            <p>You are running the installed app.</p>
            <Button asChild size="lg" variant="marketing">
              <Link href="/dashboard">
                Open {BRAND.name} <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        ) : (
          <>
            {canInstallNatively && (
              <Reveal className={styles.installBox}>
                <p>Your browser can install {BRAND.name} directly.</p>
                <Button
                  type="button"
                  size="lg"
                  variant="marketing"
                  onClick={handleInstall}
                  loading={installing}
                >
                  <Download aria-hidden="true" />
                  Install app
                </Button>
              </Reveal>
            )}

            <Reveal className={styles.centered}>
              <SegmentedControl
                label="Choose your device"
                tone="marketing"
                value={active}
                onValueChange={setOverride}
                items={GUIDES.map((entry) => ({ value: entry.id, label: entry.label }))}
                className={styles.deviceSwitch}
              />

              <div className={styles.steps}>
                <p className={styles.stepsBrowser}>
                  {guide.id === "ios" ? (
                    <Share aria-hidden="true" />
                  ) : (
                    <Smartphone aria-hidden="true" />
                  )}
                  Using {guide.browser}
                </p>
                <ol>
                  {guide.steps.map((step, index) => (
                    <li key={step}>
                      <i aria-hidden="true">{index + 1}</i>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </>
        )}
      </section>

      <section className={landing.section}>
        <SectionHeading
          eyebrow="Why install it"
          copy="It is the same app either way. Installed, it just behaves like one."
        >
          A real app, <span>without the app store.</span>
        </SectionHeading>
        <div className={styles.cards}>
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <Reveal key={title} className={styles.card}>
              <Icon />
              <h3>{title}</h3>
              <p>{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <PageCta
        eyebrow="Once it is installed"
        title={
          <>
            Sign in and <span>set up your cycle.</span>
          </>
        }
        copy="Add your salary, your payday and your regular commitments once. The daily number takes care of itself after that."
      >
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/login">
            Log in <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="marketing">
          <Link href="/register">
            Create an account <ArrowRight />
          </Link>
        </Button>
      </PageCta>
    </MarketingPage>
  );
}
