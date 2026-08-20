/**
 * The picture set someone can choose from for their profile.
 *
 * Stored by id, never by path: the file can be renamed, re-cropped or swapped
 * for a sharper export without invalidating a choice already saved on someone's
 * account. An id that no longer resolves simply falls back to initials.
 *
 * Files are pre-cropped to a square at 192px, which covers the largest place
 * one appears (a 64px swatch on a 3x screen). `next/image` serves them down
 * from there, so the 40px top-bar avatar does not download a 192px PNG.
 */
export interface AvatarOption {
  id: string;
  src: string;
  /** Read out by screen readers and used as the picker's tooltip. */
  label: string;
}

export const AVATARS: AvatarOption[] = [
  { id: "avatar-1", src: "/avatars/avatar-1.png", label: "Winking man in a black hoodie" },
  { id: "avatar-2", src: "/avatars/avatar-2.png", label: "Woman in a yellow jumper" },
  { id: "avatar-3", src: "/avatars/avatar-3.png", label: "Man in glasses and a green shirt" },
  { id: "avatar-4", src: "/avatars/avatar-4.png", label: "Woman in glasses and a pink hoodie" },
];

export function avatarById(id?: string): AvatarOption | undefined {
  if (!id) return undefined;
  return AVATARS.find((avatar) => avatar.id === id);
}

/** Up to two letters from a name, or the email as a last resort. */
export function initialsFor(name?: string, email?: string): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "SF";
  return (
    source
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "SF"
  );
}
