import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import Image from "next/image";

const MARK_SIZES = {
  sm: { px: 32, className: "h-8 w-8 rounded-[0.5rem]" },
  md: { px: 36, className: "h-9 w-9 rounded-[0.6rem]" },
  lg: { px: 40, className: "h-10 w-10 rounded-[0.65rem]" },
} as const;

type BrandSize = keyof typeof MARK_SIZES;

/**
 * The Aartha app icon. Single definition so the dashboard, auth pages and
 * landing page can never drift apart.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: BrandSize;
  className?: string;
}) {
  const mark = MARK_SIZES[size];
  return (
    <Image
      // The transparent green mark, not the app tile: this sits directly on
      // sidebar and auth surfaces, where a rounded tile would read as a
      // pasted-on icon rather than part of the lockup.
      src="/icons/brand-mark.png"
      width={mark.px}
      height={mark.px}
      alt=""
      aria-hidden="true"
      priority
      className={cn("shrink-0 object-contain", mark.className, className)}
    />
  );
}

/**
 * Mark plus wordmark. `tagline` adds the brand promise line used in the sidebar.
 * Type follows Apple's tracking guidance: tighter as the wordmark grows.
 */
export function Brand({
  size = "md",
  tagline,
  className,
}: {
  size?: BrandSize;
  tagline?: string;
  className?: string;
}) {
  return (
    <span className={cn("relative flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-semibold leading-tight tracking-[-0.015em]",
            size === "lg" ? "text-[0.95rem]" : "text-sm",
          )}
        >
          {BRAND.name}
        </span>
        {tagline && (
          <span className="mt-0.5 block truncate text-[10px] leading-tight text-muted">
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
