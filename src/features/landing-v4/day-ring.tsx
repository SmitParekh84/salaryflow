"use client";

import { formatMoney } from "@/lib/utils";
import { useRef, type CSSProperties } from "react";
import { ACCOUNT, CYCLE, RING, SAFE_TODAY } from "./cycle";
import styles from "./landing-v4.module.css";
import { Draggable, ScrollTrigger, gsap, useScene } from "./use-gsap";

/* ---------------------------------------------------------------------------
   The salary cycle as an object in space.

   This is the draft's one big idea. Every money app draws the month as a bar
   chart; the whole argument of this product is that your month is a *loop* that
   starts when you get paid. So the loop is the hero: thirty day-tiles standing
   on a ring, today facing you, the past behind your shoulder and the rest of the
   cycle curving away ahead.

   Real CSS 3D, not a fake — `perspective` on the stage, `preserve-3d` on the
   ring, each tile rotated out and pushed along its own Z. That means the browser
   composites it on the GPU, the type stays crisp because it is still text, and
   it costs nothing to load. A WebGL ring would need geometry, a font atlas and a
   raycaster to do less.

   Scroll turns the ring, so the reader scrubs through their own month and the
   figure in the middle changes as the days pass. That is the product demoed in
   one gesture, without a single screenshot.
   --------------------------------------------------------------------------- */

/** Degrees of ring rotation per pixel dragged. A day is about a thumb-flick away. */
const DEG_PER_PX = 0.26;

export function DayRing() {
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLSpanElement>(null);
  const dayLabelRef = useRef<HTMLSpanElement>(null);

  const ref = useScene<HTMLDivElement>((api, root) => {
    const stage = stageRef.current;
    const ring = ringRef.current;
    const figure = figureRef.current;
    const dayLabel = dayLabelRef.current;
    const tiles = root.querySelectorAll<HTMLElement>("[data-tile]");

    /** Turns the ring so `day` faces the reader, and updates the readout. */
    const show = (day: number) => {
      const entry = CYCLE[day - 1];
      if (!entry) return;
      if (figure) figure.textContent = formatMoney(entry.safe);
      if (dayLabel) {
        dayLabel.textContent = entry.isToday
          ? "Today"
          : `Day ${entry.day} of ${ACCOUNT.daysInCycle}`;
      }
      tiles.forEach((tile, index) => {
        tile.classList.toggle(styles.tileLive, index === day - 1);
      });
    };

    const spinTo = (day: number) => -(day - 1) * RING.step;
    /** 1-based wrap, so day 31 is day 1 and day 0 is day 30. */
    const wrapDay = (day: number) =>
      ((day - 1) % ACCOUNT.daysInCycle + ACCOUNT.daysInCycle) % ACCOUNT.daysInCycle + 1;

    api.motion(() => {
      // Entrance: the ring arrives already turning, from further away and
      // steeper, so the reader sees it *is* a ring before it settles into the
      // angle they will read it at.
      gsap.fromTo(
        ring,
        { rotateY: spinTo(1) - 40, rotateX: 26, scale: 0.86, opacity: 0 },
        {
          rotateY: spinTo(ACCOUNT.today),
          rotateX: 0,
          scale: 1,
          opacity: 1,
          duration: 1.9,
          ease: "power3.out",
        },
      );

      gsap.fromTo(
        tiles,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, stagger: { each: 0.02, from: "center" }, delay: 0.2 },
      );

      show(ACCOUNT.today);

      // Pointer lean. On the stage, not the ring, so it composes with the ring's
      // own rotation instead of overwriting it — two tweens on one element's
      // transform fight, and the ring would snap between them.
      const lean = { x: 0, y: 0 };
      const quickX = gsap.quickTo(stage, "rotateX", { duration: 0.6, ease: "power2.out" });
      const quickY = gsap.quickTo(stage, "rotateY", { duration: 0.6, ease: "power2.out" });
      const onPointer = (event: PointerEvent) => {
        const box = root.getBoundingClientRect();
        lean.x = (event.clientY - (box.top + box.height / 2)) / box.height;
        lean.y = (event.clientX - (box.left + box.width / 2)) / box.width;
        // Small angles. Past about 8° the tiles at the edge of the ring start to
        // shear badly and the illusion of a solid object breaks.
        quickX(-lean.x * 7);
        quickY(lean.y * 9);
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      // Scroll scrubs through the cycle. A bare ScrollTrigger, not a timeline
      // with a scrollTrigger on it: nothing is being tweened by scroll position
      // — the scene only needs to be told where the reader is — and a timeline
      // with no tweens has zero duration, so it never reports progress at all.
      // Annotated: `ACCOUNT` is `as const`, so an inferred type here would be
      // the literal 12 and every later assignment a type error.
      let current: number = ACCOUNT.today;
      const spin = gsap.quickTo(ring, "rotateY", { duration: 0.9, ease: "power2.out" });

      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          // The reader travels from today to the end of the cycle as the hero
          // leaves. Going backwards through the past would mean starting the
          // page mid-ring with the interesting part already behind them.
          const span = ACCOUNT.daysInCycle - ACCOUNT.today;
          const day = ACCOUNT.today + Math.round(self.progress * span);
          if (day === current) return;
          current = day;
          spin(spinTo(day));
          show(day);
        },
      });

      /*
       * Drag the ring directly.
       *
       * Scroll travels forward through the cycle, which is a narrative; drag lets
       * the reader go anywhere, including back into the days they have already
       * spent. Both write the same 'current day' state, so they can never
       * disagree about what the readout is showing.
       *
       * Draggable moves an offscreen proxy rather than the ring itself: the ring
       * is a preserve-3d element whose transform *is* the rotation, and letting
       * Draggable write x to it would append a translation and slide the ring off
       * screen as it spun.
       */
      const proxy = document.createElement("div");
      const dragUnits = RING.step / DEG_PER_PX;
      gsap.set(proxy, { x: spinTo(ACCOUNT.today) / DEG_PER_PX });

      const fromDrag = (x: number) => {
        const rotation = x * DEG_PER_PX;
        gsap.set(ring, { rotateY: rotation });
        // Wrapped, so dragging past either end of the cycle keeps going instead
        // of hitting a wall.
        const day = wrapDay(Math.round(-rotation / RING.step) + 1);
        if (day === current) return;
        current = day;
        show(day);
      };

      const [drag] = Draggable.create(proxy, {
        type: "x",
        trigger: root,
        inertia: true,
        cursor: "grab",
        activeCursor: "grabbing",
        // Vertical drags still scroll the page: a hero the reader cannot swipe
        // past on a phone is a trap.
        allowNativeTouchScrolling: true,
        onDrag() {
          fromDrag(this.x);
        },
        onThrowUpdate() {
          fromDrag(this.x);
        },
        snap: { x: (value: number) => Math.round(value / dragUnits) * dragUnits },
      });

      // Hovering a day reads it out without committing to it — the cheapest
      // possible way to let someone explore thirty days of their own cycle.
      const onEnter = (event: Event) => {
        const tile = (event.currentTarget as HTMLElement).dataset.day;
        if (tile) show(Number(tile));
      };
      const onLeaveTile = () => show(current);
      tiles.forEach((tile) => {
        tile.addEventListener("pointerenter", onEnter);
        tile.addEventListener("pointerleave", onLeaveTile);
      });

      return () => {
        window.removeEventListener("pointermove", onPointer);
        drag.kill();
        tiles.forEach((tile) => {
          tile.removeEventListener("pointerenter", onEnter);
          tile.removeEventListener("pointerleave", onLeaveTile);
        });
      };
    });

    api.still(() => {
      // No turning, no lean: the ring simply stands at today, which is the one
      // angle that makes the object legible in a single frame.
      gsap.set(ring, { rotateY: spinTo(ACCOUNT.today), opacity: 1 });
      gsap.set(tiles, { opacity: 1 });
      show(ACCOUNT.today);
    });
  });

  return (
    <div className={styles.ringWrap} ref={ref}>
      <div className={styles.ringStage} ref={stageRef}>
        {/*
          Three nested layers, each owning exactly one transform, because they
          are driven by different things and a shared transform property means
          whichever writes last wins:

            ringStage  the camera — perspective, and the pointer lean
            ringOrbit  a static push back along Z by one radius, so the front of
                       the circle lands on the screen plane instead of 420px in
                       front of the reader's face
            ring       the rotation, driven by scroll
        */}
        <div className={styles.ringOrbit}>
        <div className={styles.ring} ref={ringRef}>
          {CYCLE.map((entry) => (
            <div
              key={entry.day}
              className={`${styles.tile} ${entry.isPast ? styles.tilePast : ""}`}
              data-tile
              data-day={entry.day}
              style={
                {
                  "--angle": `${(entry.day - 1) * RING.step}deg`,
                  "--level": entry.level,
                } as CSSProperties
              }
            >
              <span className={styles.tileBar} aria-hidden />
              <span className={styles.tileDay}>{entry.day}</span>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/*
        The readout sits outside the 3D stage, flat to the screen. Putting it
        inside `preserve-3d` would tilt the one thing on the page that has to
        stay perfectly legible, and text rendered on a rotated plane in a
        browser is noticeably softer.
      */}
      <div className={styles.readout}>
        <span className={styles.readoutDay} ref={dayLabelRef}>
          Today
        </span>
        <span className={`${styles.readoutFigure} ${styles.tnum}`} ref={figureRef}>
          {formatMoney(SAFE_TODAY)}
        </span>
        <span className={styles.readoutLabel}>safe to spend</span>
      </div>
    </div>
  );
}
