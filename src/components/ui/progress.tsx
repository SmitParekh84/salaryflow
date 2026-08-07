import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  color = "var(--primary)",
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-surface-2",
        className
      )}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: color,
        }}
      />
    </div>
  );
}
