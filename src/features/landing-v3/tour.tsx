"use client";

import { BRAND } from "@/lib/brand";
import styles from "./landing-v3.module.css";
import { AiScreen, AnalyticsScreen, BillsScreen, DashboardScreen, Device } from "./app-mock";
import { ScrollTrigger, gsap, showNow, useScene } from "./use-gsap";

const STOPS = [
  {
    step: "Every day",
    title: "One number, not a balance.",
    copy: "Today's figure, and how far it has to stretch before your salary lands again.",
    Screen: DashboardScreen,
  },
  {
    step: "Once a month",
    title: "Bills are taken out first.",
    copy: "Enter a commitment once. It is protected from the day it is due, not after it clears.",
    Screen: BillsScreen,
  },
  {
    step: "Whenever you ask",
    title: "Where it actually went.",
    copy: "By category and by salary cycle, because calendar months are not how you get paid.",
    Screen: AnalyticsScreen,
  },
  {
    step: "When it matters",
    title: `${BRAND.assistantName} does the arithmetic.`,
    copy: "It answers with your salary, bills, goals and deadlines already in hand.",
    Screen: AiScreen,
  },
] as const;

/**
 * The page's only pinned scene: one phone held still while four screens pass
 * through it.
 *
 * This is the section that replaces most of v2's prose. Four screens and four
 * short captions carry what took that draft five sections of explanation, and
 * the reader sees the product rather than a description of it.
 *
 * Sticky, not ScrollTrigger's `pin`: `.page` sets `overflow-x: clip`, and a clip
 * context clips `position: fixed` descendants, so a ScrollTrigger pin is hoisted
 * out of flow and then clipped — it never appears to hold. The stage height is a
 * fixed `380vh` in CSS, which is the one thing that makes sticky viable here:
 * unlike a horizontal rail, the scroll distance does not depend on content
 * width, so it can live in the stylesheet.
 */
export function Tour() {
  const ref = useScene<HTMLElement>((api, root) => {
    const stage = root.querySelector<HTMLElement>("[data-stage]");
    const screens = root.querySelectorAll<HTMLElement>("[data-screen]");
    const captions = root.querySelectorAll<HTMLElement>("[data-caption]");
    const dots = root.querySelectorAll<HTMLElement>("[data-dot]");
    const device = root.querySelector<HTMLElement>("[data-device]");

    const activate = (index: number) => {
      screens.forEach((screen, i) => {
        gsap.to(screen, { opacity: i === index ? 1 : 0, duration: 0.3, overwrite: "auto" });
      });
      captions.forEach((caption, i) => {
        gsap.to(caption, {
          opacity: i === index ? 1 : 0,
          y: i === index ? 0 : 10,
          duration: 0.35,
          overwrite: "auto",
        });
      });
      dots.forEach((dot, i) => dot.classList.toggle(styles.tourDotOn, i === index));
    };

    api.pinned(() => {
      if (!stage) return;

      gsap.set(screens, { opacity: (i: number) => (i === 0 ? 1 : 0) });
      gsap.set(captions, { opacity: (i: number) => (i === 0 ? 1 : 0), y: (i: number) => (i === 0 ? 0 : 10) });
      activate(0);

      gsap.fromTo(
        device,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: { trigger: stage, start: "top 70%", once: true },
        },
      );

      // A bare ScrollTrigger, not a timeline with a scrollTrigger on it. The
      // first version wrapped this in `gsap.timeline({ scrollTrigger })` with no
      // tweens in the timeline: a zero-duration animation has nothing to scrub,
      // so `onUpdate` never fired and the screen never changed off the first
      // stop. Nothing here is being tweened by scroll position — the scene only
      // needs to be told where the reader is — so the trigger stands alone.
      //
      // One trigger, not four: deriving the index from progress means adding a
      // stop is a change to STOPS and nothing else.
      let current = -1;
      ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const index = Math.min(STOPS.length - 1, Math.floor(self.progress * STOPS.length));
          if (index !== current) {
            current = index;
            activate(index);
          }
        },
      });
    });

    // Off the pin the section is an ordinary stack: every screen and caption is
    // shown in sequence, so nothing is hidden behind a scroll position that no
    // longer exists.
    const stack = () => {
      showNow(screens);
      showNow(captions);
      showNow(device);
      gsap.set(screens, { opacity: 1 });
      gsap.set(captions, { opacity: 1, y: 0 });
    };

    api.narrow(stack);
    api.still(stack);
  });

  return (
    <section id="tour" className={styles.sectionLift} ref={ref}>
      <div className={styles.tourStage} data-stage>
        <div className={styles.tourPin}>
          <div className={styles.tourCopy}>
            <p className={styles.eyebrow}>A day, a month, a year</p>

            <div className={styles.tourCaptions}>
              {STOPS.map((stop) => (
                <div key={stop.title} className={styles.tourCaption} data-caption>
                  <p className={styles.tourStep}>{stop.step}</p>
                  <h2 className={styles.h2}>{stop.title}</h2>
                  <p className={styles.lead}>{stop.copy}</p>
                </div>
              ))}
            </div>

            <div className={styles.tourDots} aria-hidden>
              {STOPS.map((stop) => (
                <i key={stop.title} data-dot />
              ))}
            </div>
          </div>

          <div className={styles.tourDevice} data-device>
            {/* One frame, four screens stacked in it. The frame is labelled
                once and its contents are aria-hidden, so the screens are not
                announced individually — the captions beside the phone are real
                text and say what each one shows. */}
            <Device label="The Aartha app, showing each screen in turn">
              <div className={styles.tourScreens}>
                {STOPS.map(({ Screen, title }) => (
                  <div key={title} className={styles.tourScreen} data-screen>
                    <Screen />
                  </div>
                ))}
              </div>
            </Device>
          </div>
        </div>
      </div>
    </section>
  );
}
