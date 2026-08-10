import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level fallback for the app shell.
 *
 * Rendered by each segment's `loading.tsx`, so tapping the bottom bar swaps to
 * this frame immediately instead of leaving the previous screen on-screen while
 * data loads — the pause that reads as lag.
 *
 * It mirrors the common page shape (heading, stat row, list) rather than showing
 * a spinner: a fallback the same shape as the real content makes the swap feel
 * like the page arriving, not like a different screen flashing past.
 *
 * The stagger is short on purpose — 40ms between rows suggests things landing in
 * sequence, while a longer cascade would itself read as slowness.
 */
export function PageSkeleton() {
  return (
    <div className="animate-in fade-in duration-200" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <Skeleton className="h-7 w-40" />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton
            key={index}
            className="h-24"
            style={{ animationDelay: `${index * 40}ms` }}
          />
        ))}
      </div>

      <Skeleton className="mt-4 h-48" style={{ animationDelay: "160ms" }} />

      <div className="mt-4 space-y-2.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton
            key={index}
            className="h-16"
            style={{ animationDelay: `${200 + index * 40}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default PageSkeleton;
