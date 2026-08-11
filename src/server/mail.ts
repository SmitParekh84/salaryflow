import { Resend } from "resend";
import { createOtpEmail, type OtpEmailOptions } from "./emails/otp-email";

export type MailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "delivery-failed" };

/**
 * Sender identity.
 *
 * Aartha lives on aartha.smitparekh.co.in, but the domain verified in Resend
 * is the apex smitparekh.co.in — the subdomain is not a separate verified
 * sending domain, so the envelope must stay on the apex or Resend rejects it.
 */
const DEFAULT_FROM = "Aartha <noreply@smitparekh.co.in>";

let client: Resend | null = null;

function getMailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  if (!client) client = new Resend(apiKey);
  return { client, from: process.env.RESEND_FROM?.trim() || DEFAULT_FROM };
}

export async function sendOtpEmail(options: OtpEmailOptions): Promise<MailResult> {
  const config = getMailConfig();
  if (!config) return { sent: false, reason: "not-configured" };

  const { subject, text, html } = createOtpEmail(options);
  try {
    const { error } = await config.client.emails.send({
      from: config.from,
      to: options.to,
      subject,
      text,
      html,
    });
    // Resend reports delivery rejections in the payload, not as a thrown error.
    if (error) {
      console.error("[MAIL] OTP delivery failed", error.message);
      return { sent: false, reason: "delivery-failed" };
    }
    return { sent: true };
  } catch (error) {
    console.error(
      "[MAIL] OTP delivery failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { sent: false, reason: "delivery-failed" };
  }
}
