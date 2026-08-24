import { ImageIcon } from "lucide-react";
import styles from "./landing-v2.module.css";

/**
 * A labelled image slot, not a grey box.
 *
 * The page is designed before the art exists, so every slot states its own
 * aspect ratio and what belongs in it. Two reasons it says so on screen rather
 * than in a comment: the layout is only trustworthy if the box occupies exactly
 * the space the real image will, and whoever fills it should not have to read
 * the JSX to find out what was intended.
 *
 * Replace with `next/image` when the asset lands. `next.config.ts` sets
 * `images.unoptimized`, so a plain `<Image>` at the natural size is all that is
 * needed — no loader config, no sizes prop to get wrong.
 */
export function Placeholder({
  label,
  ratio,
  note,
}: {
  /** What the finished image shows, in the words you would use to ask for it. */
  label: string;
  /** CSS `aspect-ratio` value, e.g. "16 / 10". */
  ratio: string;
  /** Optional second line: where the shot comes from, or what must be in frame. */
  note?: string;
}) {
  return (
    <div
      className={styles.placeholder}
      style={{ aspectRatio: ratio }}
      // Decorative until it is real. Announcing "image placeholder" to a screen
      // reader adds nothing a sighted reader gets from the dashed border.
      role="presentation"
    >
      <ImageIcon aria-hidden />
      <span className={styles.placeholderLabel}>{label}</span>
      <span className={styles.placeholderMeta}>
        {ratio.replace(/\s/g, "")}
        {note ? ` · ${note}` : ""}
      </span>
    </div>
  );
}
