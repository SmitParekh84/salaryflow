"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AVATARS } from "@/lib/avatars";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { Check, KeyRound, LogOut } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ChangePasswordForm } from "./change-password-form";
import { SettingRow, SettingRows, SettingsGroup, SettingsPane } from "./settings-primitives";
import { AboutYouForm } from "@/features/chat/about-you-form";

/**
 * The Profile section of /settings.
 *
 * Reads top to bottom as three answers to one question — who is this account:
 *
 *   1. Identity   the face and the name on it
 *   2. Security   the actions that protect it
 *   3. About you  the context the assistant reads
 *
 * Security used to live under "System", two sections away, next to theme
 * switching and CSV export. That grouped "change my password" with "change the
 * colour scheme" purely because both were things you click, and it meant the
 * page describing your account could not act on it. System keeps what is
 * genuinely about the app rather than about you.
 *
 * `AboutYouForm` was previously appended after a bare `<div className="border-t">`
 * with no heading — present, but reading as an afterthought bolted below the save
 * button. It is profile data, so it gets a titled group like everything else.
 *
 * The identity form's state stays in the parent: it is seeded from the store's
 * user and saved through the same handler as before, so this component takes it
 * as props rather than forking a second source of truth.
 */
export function ProfileSection({
  avatar,
  onChooseAvatar,
  name,
  onNameChange,
  email,
  onEmailChange,
  saved,
  onSave,
}: {
  avatar?: string;
  onChooseAvatar: (avatar: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  email: string;
  onEmailChange: (email: string) => void;
  saved: boolean;
  onSave: () => void;
}) {
  // Local to this section now that it is the only thing that opens it. It was
  // hoisted to the view only because the trigger lived in another section.
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <SettingsPane
      title="User profile"
      description="Your identity on this account, and the controls that protect it."
    >
      {/*
       * Saved on tap, not on "Save changes". Picking a face is a single decision
       * with an instantly visible result — the top-bar avatar changes as you
       * tap — so making it wait behind a submit button would leave people unsure
       * whether it took.
       */}
      <SettingsGroup title="Profile picture">
        <div className="flex flex-wrap items-center gap-3">
          {AVATARS.map((option) => {
            const selected = avatar === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChooseAvatar(option.id)}
                aria-pressed={selected}
                aria-label={option.label}
                title={option.label}
                className={cn(
                  "relative rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-(--ring)",
                  selected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : "opacity-80 hover:opacity-100",
                )}
              >
                <Image
                  src={option.src}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                />
                {selected && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Clearing the choice is a choice too, and the only way back to the
              initials once a picture has been set. */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChooseAvatar("")}
            disabled={!avatar}
          >
            Use initials
          </Button>
        </div>
      </SettingsGroup>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <SettingsGroup title="Your details">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
              />
            </div>
          </div>
        </SettingsGroup>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={!name.trim() || !email.trim()}
        >
          {saved ? "Saved" : "Save changes"}
        </Button>
      </form>

      <SettingRows title="Security">
        <SettingRow label="Change password" icon={KeyRound} onClick={() => setPasswordOpen(true)} />
        {/*
         * Sign out is a row here rather than the right-aligned button it was
         * under System. It sits with the password because both act on this
         * account, and a row keeps it from reading as the pane's primary action
         * the way a standalone button next to a heading does.
         */}
        <SettingRow label="Sign out on this device" icon={LogOut} onClick={() => void logout()} />
      </SettingRows>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change password">
        <p className="mb-4 text-xs leading-relaxed text-muted">
          Your current password is needed to set a new one. Changing it signs you out everywhere
          else — this device stays signed in.
        </p>
        <ChangePasswordForm embedded />
      </Modal>

      <SettingsGroup
        title="About you"
        footnote="Only used to make the assistant's answers specific to your situation."
      >
        <AboutYouForm />
      </SettingsGroup>
    </SettingsPane>
  );
}
