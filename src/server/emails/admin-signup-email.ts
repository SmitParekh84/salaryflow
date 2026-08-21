import { BRAND } from "@/lib/brand";
import { EMAIL_COLORS } from "@/lib/theme";
import {
  emailLink,
  escapeHtml,
  MONO_STACK,
  renderButton,
  renderShell,
  SANS_STACK,
} from "./layout";

/**
 * "Someone is waiting for access" — sent to every admin when an account is
 * created and left pending.
 *
 * This is an operational email, not a product one: the reader is deciding
 * whether to act, so the two facts that decide it — who, and when — are the
 * whole body, and the button goes straight to the queue.
 *
 * The address is set in the mono stack for the same reason the OTP code is: it
 * is a string an operator has to compare character by character, and a
 * proportional face makes rn/m and 0/O ambiguous in exactly the place that
 * matters.
 */

const C = EMAIL_COLORS;

export type AdminSignupEmailOptions = {
  /** Every admin, so the queue cannot sit unnoticed because one person is away. */
  to: string[];
  signupEmail: string;
  signupName?: string | null;
  /** Pending accounts including this one, so the mail says whether it is a queue. */
  pendingCount: number;
};

export function createAdminSignupEmail({
  signupEmail,
  signupName,
  pendingCount,
}: Omit<AdminSignupEmailOptions, "to">) {
  const consoleUrl = emailLink("/admin");
  const safeEmail = escapeHtml(signupEmail);
  const displayName = signupName?.trim();

  const others = pendingCount - 1;
  const queueNote =
    others > 0
      ? `${others} other ${others === 1 ? "account is" : "accounts are"} also waiting.`
      : "Nothing else is waiting.";

  const content = `
                <h1 class="sp-heading" style="margin:0 0 10px;font-family:${SANS_STACK};font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:${C.foreground};">Someone is waiting for access</h1>
                <p class="sp-text" style="margin:0 0 22px;font-family:${SANS_STACK};font-size:15px;line-height:1.6;color:${C.muted};">A new ${escapeHtml(BRAND.name)} account was created and is pending your approval.</p>
                <div class="sp-panel" style="padding:18px 20px;border:1px solid ${C.border};border-radius:12px;background:${C.background};">
                  ${displayName ? `<div class="sp-heading" style="margin:0 0 6px;font-family:${SANS_STACK};font-size:15px;font-weight:600;line-height:1.4;color:${C.foreground};">${escapeHtml(displayName)}</div>` : ""}
                  <div class="sp-code" style="font-family:${MONO_STACK};font-size:14px;line-height:1.5;word-break:break-all;color:${C.foreground};">${safeEmail}</div>
                </div>
                ${renderButton({ href: consoleUrl, label: "Review in console" })}
                <p class="sp-subtle" style="margin:22px 0 0;font-family:${SANS_STACK};font-size:13px;line-height:1.6;color:${C.subtle};">${queueNote}</p>`;

  return {
    // The address is in the subject so an operator can triage from the inbox
    // list without opening anything.
    subject: `${signupEmail} is waiting for ${BRAND.name} access`,
    text: [
      "Someone is waiting for access.",
      "",
      displayName ? `${displayName} <${signupEmail}>` : signupEmail,
      "",
      queueNote,
      "",
      `Review in console: ${consoleUrl}`,
      "",
      `${BRAND.name} — ${BRAND.brandline}`,
    ].join("\n"),
    html: renderShell({
      title: `Pending approval · ${BRAND.name}`,
      preheader: `${signupEmail} is waiting for approval. ${queueNote}`,
      content,
    }),
  };
}
