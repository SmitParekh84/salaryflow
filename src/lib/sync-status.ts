/** How long unsaved work is allowed to sit before losing signal stops being routine. */
const ESCALATE_AFTER_MINUTES = 30;

export type SyncIndicator = {
  tone: "warning" | "danger";
  title: string;
  detail: string;
  /** Human age of the oldest unsaved change, or null while it is still recent. */
  age: string | null;
};

function formatAge(minutes: number): string | null {
  // Under a couple of minutes there is nothing to report: a save in flight and
  // a save that just failed look the same to someone watching, and putting a
  // clock on it would make an ordinary hiccup feel like a fault.
  if (minutes < 2) return null;
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * What, if anything, to show the user about unsaved work.
 *
 * Kept apart from the component so the judgement calls here — when to speak up,
 * and how loudly — are testable without a DOM.
 *
 * Silence is the default, and deliberately covers `syncing`: every write
 * queues a sync, so warning about one in flight would put a banner on screen
 * during the normal course of using the app and teach people to ignore it.
 */
export function syncIndicator({
  status,
  error,
  unsavedSince,
  now = new Date(),
}: {
  status: "idle" | "syncing" | "error" | "offline";
  error: string | null;
  unsavedSince: string | null;
  now?: Date;
}): SyncIndicator | null {
  if (status === "idle" || status === "syncing") return null;

  const since = unsavedSince ? new Date(unsavedSince) : null;
  const minutes =
    since && !Number.isNaN(since.getTime())
      ? Math.max(0, Math.floor((now.getTime() - since.getTime()) / 60_000))
      : 0;

  // Being offline is ordinary and self-correcting, so it starts as a warning.
  // Staying offline is not: past half an hour there is enough unsaved work that
  // closing the tab is a real loss, and that deserves the louder treatment
  // whatever the cause.
  const tone: SyncIndicator["tone"] =
    status === "error" || minutes >= ESCALATE_AFTER_MINUTES ? "danger" : "warning";

  return {
    tone,
    title: "Not saved yet",
    detail: error ?? "Your changes are on this device only.",
    age: formatAge(minutes),
  };
}
