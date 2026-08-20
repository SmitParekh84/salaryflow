"use client";

import { avatarById, initialsFor } from "@/lib/avatars";
import { useFinanceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * The signed-in person, as a picture if they picked one and as their initials
 * if they did not.
 *
 * Reads the choice from the store rather than taking it as a prop, so every
 * place that shows the user — the top bar, the settings preview — cannot drift
 * out of step with the other.
 */
export function UserAvatar({ size = 36, className }: { size?: number; className?: string }) {
  const user = useFinanceStore((state) => state.user);
  const avatar = avatarById(useFinanceStore((state) => state.profile.avatar));

  if (avatar) {
    return (
      <Image
        src={avatar.src}
        alt=""
        width={size}
        height={size}
        // Decorative here: the button around it is already labelled with the
        // account name, so announcing the picture would only repeat it.
        aria-hidden
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/60 font-bold text-primary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initialsFor(user.name, user.email)}
    </span>
  );
}
