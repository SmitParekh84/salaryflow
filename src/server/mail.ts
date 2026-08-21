import { BRAND } from "@/lib/brand";
import { Resend } from "resend";
import { createAdminSignupEmail, type AdminSignupEmailOptions } from "./emails/admin-signup-email";
import { createApprovalEmail, type ApprovalEmailOptions } from "./emails/approval-email";
import { createOtpEmail, type OtpEmailOptions } from "./emails/otp-email";
import { createRejectionEmail, type RejectionEmailOptions } from "./emails/rejection-email";

export type MailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "delivery-failed" };

/**
 * Sender identity.
 *
 * Only the display name moves to Aartha here. The envelope stays on the apex
 * smitparekh.co.in because that is the domain currently verified in Resend, and
 * Resend rejects a `from` on any unverified domain.
 *
 * To send from aartha.app: verify it in Resend first, then set
 * `RESEND_FROM="Aartha <noreply@aartha.app>"`. Changing this default ahead of
 * that verification would silently break registration and password reset.
 */
const DEFAULT_FROM = `${BRAND.name} <noreply@smitparekh.co.in>`;

let client: Resend | null = null;

function getMailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  if (!client) client = new Resend(apiKey);
  return { client, from: process.env.RESEND_FROM?.trim() || DEFAULT_FROM };
}

/**
 * The single send path, shared by every template.
 *
 * Extracted from `sendOtpEmail`, which used to own this inline. The subtlety
 * worth keeping in one place is the `error` check: Resend reports a delivery
 * rejection in the *payload*, not by throwing, so a caller that only wraps the
 * await in a try/catch reports success on a rejected send. Every sender below
 * would have had to remember that independently.
 *
 * `label` is only for the log line — it names which template failed, which is
 * the first thing you want when mail stops arriving.
 */
async function send(
  label: string,
  to: string | string[],
  message: { subject: string; text: string; html: string },
): Promise<MailResult> {
  const config = getMailConfig();
  if (!config) return { sent: false, reason: "not-configured" };

  if (Array.isArray(to) && to.length === 0) return { sent: true };

  try {
    const { error } = await config.client.emails.send({
      from: config.from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (error) {
      console.error(`[MAIL] ${label} delivery failed`, error.message);
      return { sent: false, reason: "delivery-failed" };
    }
    return { sent: true };
  } catch (error) {
    console.error(
      `[MAIL] ${label} delivery failed`,
      error instanceof Error ? error.message : "Unknown error",
    );
    return { sent: false, reason: "delivery-failed" };
  }
}

export function sendOtpEmail(options: OtpEmailOptions): Promise<MailResult> {
  return send("OTP", options.to, createOtpEmail(options));
}

export function sendApprovalEmail(options: ApprovalEmailOptions): Promise<MailResult> {
  return send("approval", options.to, createApprovalEmail(options));
}

export function sendRejectionEmail(options: RejectionEmailOptions): Promise<MailResult> {
  return send("rejection", options.to, createRejectionEmail(options));
}

export function sendAdminSignupEmail(options: AdminSignupEmailOptions): Promise<MailResult> {
  return send("admin signup alert", options.to, createAdminSignupEmail(options));
}
