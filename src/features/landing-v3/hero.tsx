"use client";

import { formatMoney } from "@/lib/utils";
import { ArrowRight, Play, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import Link from "next/link";
import styles from "./landing-v3.module.css";
import { BillsScreen, DEMO, Device } from "./app-mock";
import { countTo, gsap, showNow, useScene } from "./use-gsap";

const META = [
  { Icon: ShieldCheck, label: "No bank connection" },
  { Icon: WifiOff, label: "Works offline" },
  { Icon: Smartphone, label: "Installs like an app" },
];

/**
 * Six words of headline, one line of copy, and the product taking half the fold.
 *
 * The art is two surfaces at different depths, showing two different screens: the
 * panel carries today's figure and where the cycle stands, the phone carries the
 * bills calendar. Two screens rather than the same one twice — the fold then says
 * "there is a real app here, and it runs in your hand" instead of inviting the
 * reader to compare two renderings of one card.
 */
export function Hero() {
  const ref = useScene<HTMLElement>((api, root) => {
    const copy = root.querySelectorAll<HTMLElement>("[data-copy]");
    const panel = root.querySelector<HTMLElement>("[data-panel]");
    const phone = root.querySelector<HTMLElement>("[data-phone]");
    const rows = root.querySelectorAll<HTMLElement>("[data-row]");
    // Both surfaces show the figure, so both count. Animating only one left the
    // panel counting while the phone beside it already showed the answer.
    const safe = root.querySelectorAll<HTMLElement>("[data-count-safe]");
    const bar = root.querySelector<HTMLElement>("[data-safe-bar]");

    api.motion(() => {
      const timeline = gsap.timeline({ defaults: { ease: "cubic-bezier(0.23,1,0.32,1)" } });

      timeline
        .fromTo(copy, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 })
        .fromTo(panel, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.9 }, 0.15)
        // The rows deal in after the panel exists, so the panel reads as a
        // surface being filled rather than as a finished picture fading up.
        .fromTo(rows, { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.07 }, 0.5)
        .fromTo(phone, { opacity: 0, y: 40, rotate: -3 }, { opacity: 1, y: 0, rotate: 0, duration: 0.9 }, 0.4)
        .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.9, transformOrigin: "0 50%" }, 0.7);

      safe.forEach((el) => countTo(el, DEMO.safeToday, formatMoney, 1.3));

      // Depth on the way out: the phone leaves a little faster than the panel.
      gsap.to(phone, {
        y: -46,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.7 },
      });
    });

    api.still(() => {
      showNow(copy);
      showNow(panel);
      showNow(phone);
      showNow(rows);
      gsap.set(bar, { scaleX: 1 });
      safe.forEach((el) => {
        el.textContent = formatMoney(DEMO.safeToday);
      });
    });
  });

  return (
    <section className={styles.hero} ref={ref}>
      <div className={styles.glow} aria-hidden />

      <div className={styles.heroCopy}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-copy>
          Salary-cycle money app
        </p>

        <h1 className={`${styles.display} ${styles.reveal}`} data-copy>
          Spend today without <span className={styles.accent}>wondering.</span>
        </h1>

        <p className={`${styles.lead} ${styles.reveal}`} data-copy>
          Aartha takes your bills, goals and investments out of your balance and gives
          you one number for today.
        </p>

        <div className={`${styles.heroActions} ${styles.reveal}`} data-copy>
          <Link href="/waitlist" className={styles.btn}>
            Join the waitlist
            <ArrowRight aria-hidden />
          </Link>
          <Link href="/login?demo=1" className={styles.btnGhost}>
            <Play aria-hidden />
            Open the demo
          </Link>
        </div>

        <div className={`${styles.metaRow} ${styles.reveal}`} data-copy>
          {META.map(({ Icon, label }) => (
            <span key={label}>
              <Icon aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.heroArt}>
        <div className={styles.heroStack}>
          <div className={`${styles.panel} ${styles.reveal}`} data-panel>
            <div className={styles.panelBar}>
              <span className={styles.panelDots} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              aartha.app / dashboard
            </div>
            <div className={styles.panelBody}>
              <PanelCycle />
            </div>
          </div>

          <div className={`${styles.heroPhone} ${styles.reveal}`} data-phone>
            <Device label="The Aartha bills calendar on a phone, with paid and upcoming days marked">
              <BillsScreen />
            </Device>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The cycle on the wide surface: the figure, then the four lines that produce it.
 */
function PanelCycle() {
  const rows = [
    { label: "Salary", value: DEMO.salary, tone: "in" as const },
    { label: "Bills protected", value: -DEMO.bills },
    { label: "Savings & investments", value: -(DEMO.savings + DEMO.investments) },
    { label: "Left for this cycle", value: DEMO.available, tone: "accent" as const },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className={styles.safeCard} style={{ borderRadius: 16, padding: 20 }}>
        <span className={styles.safeLabel} style={{ fontSize: 11 }}>
          Safe to spend today
        </span>
        <strong
          className={`${styles.safeNumber} ${styles.tnum}`}
          style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)" }}
          data-count-safe
        >
          {formatMoney(DEMO.safeToday)}
        </strong>
        <span className={styles.safeMeta} style={{ fontSize: 13 }}>
          {DEMO.daysToPayday} days until payday
        </span>
        <div className={styles.safeTrack} style={{ height: 6, marginTop: 10 }} aria-hidden>
          <i data-safe-bar style={{ width: "41%" }} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <span
            key={row.label}
            className={styles.moneyRow}
            style={{ borderRadius: 12, fontSize: 14, padding: "13px 15px" }}
            data-row
          >
            <span>{row.label}</span>
            <b
              className={`${styles.tnum} ${
                row.tone === "accent" ? styles.rowAccent : row.tone === "in" ? styles.rowIn : ""
              }`}
            >
              {row.value < 0 ? `−${formatMoney(Math.abs(row.value))}` : formatMoney(row.value)}
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}
