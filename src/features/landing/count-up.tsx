"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const FORMAT = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/**
 * Counts a rupee figure up to `value` the first time it scrolls into view.
 *
 * The number is rendered server-side at its final value and only reset to the
 * start once the client has hydrated, so the figure is correct for search
 * engines, for a reader with JavaScript disabled, and for anyone whose OS asks
 * for reduced motion. It never counts twice.
 *
 * `tabular-nums` is set on the element so the digits do not reflow the line as
 * they change — without it a counting number visibly jitters its own width.
 */
export function CountUp({
  value,
  duration = 1.1,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const still = useReducedMotion();
  const [display, setDisplay] = useState(value);

  // State starts at the final figure and is only ever moved by the animation's
  // own onUpdate, never by this effect's body: the server markup, the first
  // client render and the reduced-motion render are then all the same string,
  // so there is no hydration mismatch and no wasted render pass. `animate`
  // reports its first frame at 0, which is what starts the count.
  useEffect(() => {
    if (still || !inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [still, inView, value, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      ₹{FORMAT.format(Math.round(display))}
    </span>
  );
}
