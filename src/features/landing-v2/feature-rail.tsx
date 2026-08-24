"use client";

import { BRAND } from "@/lib/brand";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  FileUp,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import styles from "./landing-v2.module.css";
import { EASE_OUT, ScrollTrigger, gsap, revealIn, showNow, useScene } from "./use-gsap";

/**
 * Every feature the app actually ships, in the order the sidebar lists them.
 *
 * Kept in step with `NAV_ITEMS` in src/lib/constants.ts, plus statement import,
 * which is a real capability with no nav entry of its own. The icons are the
 * same lucide glyphs the app uses for each area, so a reader who signs up
 * recognises the screen they were sold.
 */
const FEATURES = [
  {
    Icon: LayoutDashboard,
    title: "Dashboard",
    copy: "One number for today, and exactly where this salary cycle stands.",
  },
  {
    Icon: BadgeIndianRupee,
    title: "Salary plan",
    copy: "Decide what each payday funds before it arrives, not after it is gone.",
  },
  {
    Icon: Landmark,
    title: "Accounts",
    copy: "Every account and its real balance, reconciled rather than guessed.",
  },
  {
    Icon: Receipt,
    title: "Expenses",
    copy: "Log what you spent in seconds. Categories it can infer, it infers.",
  },
  {
    Icon: Users,
    title: "Shared spending",
    copy: "What you have split, what came back, and what is still owed.",
  },
  {
    Icon: CalendarClock,
    title: "Bills",
    copy: "Every commitment with its due date, protected before anything else.",
  },
  {
    Icon: Target,
    title: "Goals",
    copy: "Save towards something with a deadline the plan can actually hit.",
  },
  {
    Icon: TrendingUp,
    title: "Investments",
    copy: "What you hold, held out of the number you are free to spend.",
  },
  {
    Icon: BarChart3,
    title: "Analytics",
    copy: "Where it went, by category and by cycle rather than by calendar month.",
  },
  {
    Icon: Sparkles,
    title: BRAND.assistantName,
    copy: "An adviser that answers with your own salary, bills and goals in hand.",
  },
  {
    Icon: ListChecks,
    title: "Budget rules",
    copy: "Set the split once and let every payday follow it on its own.",
  },
  {
    Icon: FileUp,
    title: "Statement import",
    copy: "Bring in months of bank history instead of typing it back in.",
  },
  {
    Icon: Trash2,
    title: "Recycle bin",
    copy: "Nothing you delete is really gone until you say so a second time.",
  },
] as const;

/**
 * Thirteen features without a thirteen-section page.
 *
 * The rail is pinned and scrubbed sideways: the reader keeps scrolling down and
 * the cards move across, which is the only honest way to show a set this size
 * without either burying nine of them in a grid or making the page twice as
 * long as it should be.
 *
 * The pin is CSS `sticky` and the scrub is a ScrollTrigger — the two are split
 * deliberately. ScrollTrigger's own `pin` cannot be used because it works by
 * setting `position: fixed`, and `.page` has `overflow-x: clip` to contain the
 * hero aurora; a clip context clips fixed descendants, so the pinned rail was
 * hoisted out of flow and clipped away, scrolling past without ever holding.
 * Sticky is immune to that. What sticky cannot do is derive the stage height
 * from the track's horizontal overflow, so the scene builder sets it.
 */
export function FeatureRail() {
  const ref = useScene<HTMLElement>((api, root) => {
    const stage = root.querySelector<HTMLElement>("[data-stage]");
    const track = root.querySelector<HTMLElement>("[data-track]");
    const head = root.querySelectorAll<HTMLElement>("[data-head]");
    const cards = root.querySelectorAll<HTMLElement>("[data-card]");

    api.pinned(() => {
      if (!stage || !track) return;

      gsap.fromTo(head, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.8, ease: EASE_OUT, stagger: 0.08,
        scrollTrigger: { trigger: stage, start: "top 75%", once: true },
      });

      // The cards are already on screen when the pin engages, so they get their
      // entrance from the pin itself rather than from a per-card trigger — a
      // trigger on a card that only ever moves horizontally never fires.
      gsap.fromTo(cards, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.7, ease: EASE_OUT, stagger: 0.05,
        scrollTrigger: { trigger: stage, start: "top 60%", once: true },
      });

      // Measured in a function, not once: `invalidateOnRefresh` re-runs these on
      // every resize, so rotating a tablet re-derives the distance instead of
      // scrubbing to a stale one and leaving the last cards unreachable.
      const overflow = () => Math.max(0, track.scrollWidth - window.innerWidth);

      // The stage has to be exactly one viewport (what the sticky pin occupies)
      // plus the horizontal distance still to travel. Set through `gsap.set` and
      // not `style.height` so matchMedia's revert puts the stylesheet's own
      // height back when this branch stops matching.
      const size = () => gsap.set(stage, { height: window.innerHeight + overflow() });
      size();

      gsap.to(track, {
        x: () => -overflow(),
        ease: "none",
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          // Before the measurement, not after: ScrollTrigger derives start and
          // end from the stage's height, so a resize has to change the height
          // first or the scrub is calibrated against the old one.
          onRefreshInit: size,
          invalidateOnRefresh: true,
        },
      });

      // The rail is the one place on the page where content sits off-screen, so
      // it matters that nothing here requires a horizontal gesture: the scrub is
      // driven by ordinary vertical scroll, which Page Down, the arrow keys and
      // a scrollbar drag all produce. There is nothing focusable inside a card,
      // so no element can take focus while it is out of view.
      ScrollTrigger.refresh();
    });

    // Below the pin threshold the track is an ordinary grid (see the
    // `max-width: 900px` block in the stylesheet), so the cards get the house
    // reveal instead of the scrub.
    api.narrow(() => {
      showNow(head);
      revealIn(cards, { trigger: root, stagger: 0.04 });
    });

    api.still(() => {
      showNow(head);
      showNow(cards);
    });
  });

  return (
    <section id="features" className={`${styles.sectionLift} ${styles.sectionRule}`} ref={ref}>
      <div className={styles.railStage} data-stage>
        <div className={styles.railPin}>
          <div className={styles.railHead}>
            <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
              Everything in one place
            </p>
            <h2 className={`${styles.h2} ${styles.reveal}`} data-head>
              Thirteen parts, <span className={styles.accent}>one number.</span>
            </h2>
            <p className={`${styles.lead} ${styles.reveal}`} data-head>
              Each of these feeds the figure on your dashboard. None of them asks you to
              keep a spreadsheet on the side.
            </p>
          </div>

          <div className={styles.railTrack} data-track>
            {FEATURES.map(({ Icon, title, copy }, index) => (
              <article key={title} className={`${styles.railCard} ${styles.reveal}`} data-card>
                <span className={styles.railIcon}>
                  <Icon aria-hidden />
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <p className={`${styles.railNumber} ${styles.mono}`}>
                  {String(index + 1).padStart(2, "0")} / {FEATURES.length}
                </p>
              </article>
            ))}
          </div>

          <p className={styles.railHint}>
            <ArrowRight aria-hidden />
            Keep scrolling
          </p>
        </div>
      </div>
    </section>
  );
}
