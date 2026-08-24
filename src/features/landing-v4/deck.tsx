"use client";

import { BRAND } from "@/lib/brand";
import {
  ArrowLeft,
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
import { useRef, useState, type CSSProperties } from "react";
import styles from "./landing-v4.module.css";
import { Draggable, gsap, showNow, useScene } from "./use-gsap";

/* ---------------------------------------------------------------------------
   Thirteen features, on a carousel you can throw.

   The previous version was a grid, and a grid of thirteen is the worst possible
   number: six across leaves one card orphaned on a row of its own, and the
   depth on the cards was invisible because nothing ever moved. It read as a
   checklist, which is the criticism this section earned.

   So it became a ring — the same ring language as the hero, deliberately, so the
   page has one spatial idea rather than three unrelated ones. Thirteen cards on
   a cylinder you can drag, throw, arrow-key or scroll-wheel through, with the
   card in front enlarged and its detail shown.

   Everything about the interaction is GSAP's Draggable plus InertiaPlugin, both
   already in the installed package: a throw carries momentum, decelerates, and
   snaps to the nearest card rather than stopping between two of them.
   --------------------------------------------------------------------------- */

const FEATURES = [
  {
    Icon: LayoutDashboard,
    label: "Dashboard",
    note: "One number for today, and where this cycle stands.",
  },
  {
    Icon: BadgeIndianRupee,
    label: "Salary plan",
    note: "Decide what each payday funds before it arrives.",
  },
  { Icon: Landmark, label: "Accounts", note: "Every balance, reconciled rather than guessed." },
  { Icon: Receipt, label: "Expenses", note: "Log what you spent in seconds." },
  { Icon: Users, label: "Shared spending", note: "What you split, and who still owes you." },
  { Icon: CalendarClock, label: "Bills", note: "Protected from the day they are due." },
  { Icon: Target, label: "Goals", note: "With deadlines the plan can actually hit." },
  { Icon: TrendingUp, label: "Investments", note: "Held out of your spendable number." },
  { Icon: BarChart3, label: "Analytics", note: "By category and by cycle, not by month." },
  {
    Icon: Sparkles,
    label: BRAND.assistantName,
    note: "An adviser that already knows your numbers.",
  },
  { Icon: ListChecks, label: "Budget rules", note: "Set the split once; payday follows it." },
  { Icon: FileUp, label: "Statement import", note: "Months of history without retyping it." },
  { Icon: Trash2, label: "Recycle bin", note: "Nothing you delete is really gone." },
] as const;

const STEP = 360 / FEATURES.length;
/** Degrees of rotation per pixel dragged. Tuned so a card is about a thumb-flick away. */
const DEG_PER_PX = 0.28;

export function Deck() {
  const trackRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const ref = useScene<HTMLElement>((api, root) => {
    const track = trackRef.current;
    const proxy = proxyRef.current;
    const head = root.querySelectorAll<HTMLElement>("[data-head]");
    const cards = root.querySelectorAll<HTMLElement>("[data-card]");

    /** Wraps an index into range, so dragging past the end keeps going. */
    const wrap = (index: number) => ((index % FEATURES.length) + FEATURES.length) % FEATURES.length;

    const paint = (rotation: number) => {
      // Which card is nearest the front, derived from the rotation rather than
      // tracked separately — so a throw, a key press and a snap can never
      // disagree about what is selected.
      const index = wrap(Math.round(-rotation / STEP));
      setActive(index);
      cards.forEach((card, i) => card.classList.toggle(styles.cardLive, i === index));
    };

    api.motion(() => {
      gsap.fromTo(head, { opacity: 0, y: 22 }, {
        opacity: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 0.08,
        scrollTrigger: { trigger: root, start: "top 80%", once: true },
      });

      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: "power2.out",
          stagger: { each: 0.04, from: "center" },
          scrollTrigger: { trigger: root, start: "top 74%", once: true },
        },
      );

      if (!track || !proxy) return;

      const spin = gsap.quickTo(track, "rotateY", { duration: 0.5, ease: "power2.out" });
      const state = { rotation: 0 };

      const goTo = (index: number, immediate = false) => {
        state.rotation = -index * STEP;
        if (immediate) gsap.set(track, { rotateY: state.rotation });
        else spin(state.rotation);
        paint(state.rotation);
      };

      paint(0);

      /*
       * Draggable on an invisible proxy rather than on the track itself.
       *
       * The track is a `preserve-3d` element whose transform is the rotation;
       * letting Draggable write `x` to it would append a translation to that
       * transform and the ring would slide off screen as it spun. The proxy is a
       * throwaway div nobody sees: Draggable moves *it*, and its x is read as an
       * angle. This is also what makes inertia work — the plugin needs a real
       * moving element with velocity to decelerate.
       */
      const [drag] = Draggable.create(proxy, {
        type: "x",
        trigger: track,
        inertia: true,
        // Cursor stays a grab affordance rather than becoming a text caret.
        cursor: "grab",
        activeCursor: "grabbing",
        allowNativeTouchScrolling: true,
        onDrag() {
          state.rotation = this.x * DEG_PER_PX;
          gsap.set(track, { rotateY: state.rotation });
          paint(state.rotation);
        },
        onThrowUpdate() {
          state.rotation = this.x * DEG_PER_PX;
          gsap.set(track, { rotateY: state.rotation });
          paint(state.rotation);
        },
        // Snap in the proxy's own units, so the throw settles with a card
        // squarely in front instead of stopping between two.
        snap: {
          x: (value: number) => Math.round(value / (STEP / DEG_PER_PX)) * (STEP / DEG_PER_PX),
        },
      });

      // Keyboard. A drag-only control is unusable without a pointer, and the
      // cards carry real content, so this is not optional.
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const current = Math.round(-state.rotation / STEP);
        const next = current + (event.key === "ArrowRight" ? 1 : -1);
        goTo(next);
        // Keep the proxy in step, or the next drag jumps back to where the
        // pointer last left it.
        gsap.set(proxy, { x: -next * (STEP / DEG_PER_PX) });
      };
      root.addEventListener("keydown", onKey);

      return () => {
        drag.kill();
        root.removeEventListener("keydown", onKey);
      };
    });

    api.still(() => {
      showNow(head);
      showNow(cards);
      gsap.set(cards, { opacity: 1, scale: 1 });
      paint(0);
    });
  });

  const current = FEATURES[active];

  return (
    <section id="features" className={styles.section} ref={ref}>
      <div className={`${styles.sectionHead} ${styles.center}`}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
          The whole surface
        </p>
        <h2 className={`${styles.h2} ${styles.reveal}`} data-head>
          Thirteen parts. <span className={styles.accent}>One number.</span>
        </h2>
      </div>

      {/*
        `tabIndex` and the roles make this a real listbox rather than a mouse toy:
        it can be tabbed to and driven with the arrow keys, and the active card is
        announced. The visual carousel is decorative on top of that.
      */}
      <div
        className={styles.carousel}
        role="listbox"
        aria-label="Aartha features"
        aria-activedescendant={`v4-feature-${active}`}
        tabIndex={0}
      >
        <div className={styles.carouselStage}>
          <div className={styles.carouselTrack} ref={trackRef}>
            {FEATURES.map(({ Icon, label }, index) => (
              <article
                key={label}
                id={`v4-feature-${index}`}
                className={styles.card}
                data-card
                role="option"
                aria-selected={index === active}
                style={{ "--angle": `${index * STEP}deg` } as CSSProperties}
              >
                <span className={styles.cardIcon}>
                  <Icon aria-hidden />
                </span>
                <span className={styles.cardLabel}>{label}</span>
              </article>
            ))}
          </div>
        </div>

        {/* The proxy Draggable actually moves. Never visible, never focusable. */}
        <div className={styles.dragProxy} ref={proxyRef} aria-hidden />

        {/* The detail for the card in front, in flat screen space so it stays
            crisp — and one element that changes, rather than thirteen sentences
            all on screen at once. */}
        <div className={styles.carouselDetail} aria-live="polite">
          <strong>{current.label}</strong>
          <span>{current.note}</span>
        </div>

        <p className={styles.carouselHint}>
          <ArrowLeft aria-hidden />
          Drag, throw, or use the arrow keys
          <ArrowRight aria-hidden />
        </p>
      </div>
    </section>
  );
}

