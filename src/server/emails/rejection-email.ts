import { BRAND } from "@/lib/brand";
import { EMAIL_COLORS } from "@/lib/theme";
import { escapeHtml, renderShell, SANS_STACK } from "./layout";

/**
 * "We're not able to open an account" — sent when an admin rejects a signup.
 *
 * Short, and with no call to action, which is the whole design. There is nothing
 * for the reader to do here: a button would imply a next step that does not
 * exist, and a "try again" link would invite a second signup that gets rejected
 * the same way.
 *
 * No reason is given. We do not collect one, and inventing a category ("your
 * details could not be verified") would be a guess dressed as a decision. What
 * the email does carry is a reply-to path — the support address — so a genuine
 * mistake has a route back that is a human rather than a form.
 */

const C = EMAIL_COLORS;

export type RejectionEmailOptions = {
  to: string;
  name?: string | null;
};

export function createRejectionEmail({ name }: Omit<RejectionEmailOptions, "to">) {
  const firstName = name?.trim().split(/\s+/)[0];
  const opening = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";

  const content = `
                <h1 class="sp-heading" style="margin:0 0 10px;font-family:${SANS_STACK};font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.02em;color:${C.foreground};">About your ${escapeHtml(BRAND.name)} request</h1>
                <p class="sp-text" style="margin:0 0 16px;font-family:${SANS_STACK};font-size:15px;line-height:1.6;color:${C.muted};">${opening} thank you for your interest in ${escapeHtml(BRAND.name)}. We&rsquo;re not able to open an account for you at this time.</p>
                <p class="sp-text" style="margin:0;font-family:${SANS_STACK};font-size:15px;line-height:1.6;color:${C.muted};">If you think this is a mistake, reply to this email and a person will read it.</p>`;

  return {
    subject: `About your ${BRAND.name} request`,
    text: [
      `${firstName ? `Hi ${firstName},` : "Hi,"} thank you for your interest in ${BRAND.name}.`,
      "",
      "We're not able to open an account for you at this time.",
      "",
      "If you think this is a mistake, reply to this email and a person will read it.",
      "",
      `${BRAND.name} — ${BRAND.brandline}`,
    ].join("\n"),
    html: renderShell({
      title: `About your request · ${BRAND.name}`,
      // Deliberately neutral. The outcome belongs in the message, not in the
      // inbox list beside unrelated mail.
      preheader: `An update on your ${BRAND.name} account request.`,
      content,
    }),
  };
}
