import { BRAND } from "@/lib/brand";
import { EMAIL_COLORS } from "@/lib/theme";
import { emailLink, escapeHtml, renderButton, renderShell, SANS_STACK } from "./layout";

/**
 * "Your access is approved" — sent when an admin lets a pending account in.
 *
 * The opposite shape to the OTP email, and for the same reason that one has no
 * button: here there genuinely is somewhere to go. So this template gets exactly
 * one call to action and nothing that competes with it — no feature tour, no
 * secondary link, no "meanwhile, why not…". The reader has one job, which is to
 * sign in, and every line is either that or the reassurance that gets them there.
 */

const C = EMAIL_COLORS;

export type ApprovalEmailOptions = {
  to: string;
  /** Used only to greet by first name when we have one. */
  name?: string | null;
};

export function createApprovalEmail({ name }: Omit<ApprovalEmailOptions, "to">) {
  // First name only. A full legal name in a greeting reads like a bank letter,
  // and an empty greeting is better than an awkward one.
  const firstName = name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `${escapeHtml(firstName)}, you&rsquo;re in.` : "You&rsquo;re in.";
  const loginUrl = emailLink("/login");

  const content = `
                <h1 class="sp-heading" style="margin:0 0 10px;font-family:${SANS_STACK};font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:${C.foreground};">${greeting}</h1>
                <p class="sp-text" style="margin:0 0 4px;font-family:${SANS_STACK};font-size:15px;line-height:1.6;color:${C.muted};">Your ${escapeHtml(BRAND.name)} account has been approved. Sign in with the email and password you signed up with, and you can set up your salary cycle straight away.</p>
                ${renderButton({ href: loginUrl, label: "Sign in" })}
                <p class="sp-text" style="margin:26px 0 0;font-family:${SANS_STACK};font-size:13px;line-height:1.6;color:${C.muted};">Trouble with the button? Open <span style="color:${C.foreground};">${escapeHtml(loginUrl)}</span> in your browser.</p>`;

  return {
    subject: `Your ${BRAND.name} account is approved`,
    text: [
      firstName ? `${firstName}, you're in.` : "You're in.",
      "",
      `Your ${BRAND.name} account has been approved. Sign in with the email and password you signed up with, and you can set up your salary cycle straight away.`,
      "",
      `Sign in: ${loginUrl}`,
      "",
      `${BRAND.name} — ${BRAND.brandline}`,
    ].join("\n"),
    html: renderShell({
      title: `Your account is approved · ${BRAND.name}`,
      preheader: `Your ${BRAND.name} account is approved — sign in to get started.`,
      content,
    }),
  };
}
