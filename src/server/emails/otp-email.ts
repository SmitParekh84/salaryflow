import { EMAIL_COLORS } from "@/lib/theme";
import { escapeHtml, MONO_STACK, renderShell, SANS_STACK } from "./layout";

/**
 * One-time-code email for registration and password reset.
 *
 * The reader has exactly one job: read six digits and retype them. Everything
 * in this template is subordinate to that — one visual peak on the code, the
 * expiry attached to it rather than floated as a separate thought, and no call
 * to action competing for the same attention. There is no link to click, so
 * adding a button would only be noise.
 */

const C = EMAIL_COLORS;

export type OtpEmailOptions = {
  to: string;
  code: string;
  purpose: "register" | "reset";
  expiresInMinutes: number;
};

/** Letter-spacing also trails the final digit, pushing centred text half a step
 *  left of optical centre. A `text-indent` of the same size cancels it exactly. */
const CODE_TRACKING_PX = 10;

export function createOtpEmail({ code, purpose, expiresInMinutes }: Omit<OtpEmailOptions, "to">) {
  const isRegistration = purpose === "register";
  const safeCode = escapeHtml(code);

  const heading = isRegistration ? "Verify your email" : "Reset your password";
  const lead = isRegistration
    ? "Enter this code to finish creating your Spendly account."
    : "Enter this code to choose a new password.";
  const reassurance = isRegistration
    ? "Didn&rsquo;t request this? Ignore this email &mdash; no account was created."
    : "Didn&rsquo;t request this? Ignore this email &mdash; your password is unchanged.";
  const expiry = `Expires in ${expiresInMinutes} minutes`;

  const content = `
                <h1 class="sp-heading" style="margin:0 0 10px;font-family:${SANS_STACK};font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:${C.foreground};">${heading}</h1>
                <p class="sp-text" style="margin:0 0 24px;font-family:${SANS_STACK};font-size:15px;line-height:1.6;color:${C.muted};">${lead}</p>
                <div class="sp-panel" style="padding:22px 16px;border:1px solid ${C.border};border-radius:12px;background:${C.background};text-align:center;">
                  <div class="sp-code" style="font-family:${MONO_STACK};font-size:34px;font-weight:600;line-height:1;mso-line-height-rule:exactly;letter-spacing:${CODE_TRACKING_PX}px;text-indent:${CODE_TRACKING_PX}px;white-space:nowrap;color:${C.foreground};">${safeCode}</div>
                  <div class="sp-subtle" style="margin-top:14px;font-family:${SANS_STACK};font-size:12px;line-height:1;color:${C.subtle};">${expiry}</div>
                </div>
                <p class="sp-text" style="margin:24px 0 0;font-family:${SANS_STACK};font-size:13px;line-height:1.6;color:${C.muted};">${reassurance}</p>`;

  return {
    subject: isRegistration
      ? `${code} is your Spendly verification code`
      : `${code} is your Spendly reset code`,
    // Leads with the code so it is readable from the notification or inbox list
    // without opening the message at all.
    text: [
      `${code} — ${heading.toLowerCase()}`,
      "",
      lead,
      `This code expires in ${expiresInMinutes} minutes.`,
      "",
      isRegistration
        ? "Didn't request this? Ignore this email — no account was created."
        : "Didn't request this? Ignore this email — your password is unchanged.",
      "",
      "Spendly — Spend with clarity.",
    ].join("\n"),
    html: renderShell({
      title: `${heading} · Spendly`,
      preheader: `${code} · ${expiry}.`,
      content,
    }),
  };
}
