import { EMAIL_COLORS } from "@/lib/theme";
import nodemailer from "nodemailer";

type OtpEmailOptions = {
  to: string;
  code: string;
  purpose: "register" | "reset";
  expiresInMinutes: number;
};

export type MailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "delivery-failed" };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !user || !pass || !from) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    from,
  };
}

function createOtpEmail({ code, purpose, expiresInMinutes }: OtpEmailOptions) {
  const isRegistration = purpose === "register";
  const title = isRegistration
    ? "Verify your SalaryFlow account"
    : "Reset your SalaryFlow password";
  const preheader = isRegistration
    ? "Use this code to finish creating your SalaryFlow account."
    : "Use this code to reset your SalaryFlow password.";
  const action = isRegistration ? "finish creating your account" : "reset your password";
  const safeCode = escapeHtml(code);

  return {
    subject: isRegistration
      ? `${code} is your SalaryFlow verification code`
      : `${code} is your SalaryFlow reset code`,
    text: [
      title,
      "",
      `Use this verification code to ${action}:`,
      code,
      "",
      `This code expires in ${expiresInMinutes} minutes.`,
      "If you did not request this code, you can safely ignore this email.",
      "",
      "SalaryFlow",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;background:${EMAIL_COLORS.background};color:${EMAIL_COLORS.foreground};font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${EMAIL_COLORS.background};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:${EMAIL_COLORS.surface};border:1px solid ${EMAIL_COLORS.border};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 18px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" width="36" height="36" style="width:36px;height:36px;border-radius:8px;background:${EMAIL_COLORS.brand};color:${EMAIL_COLORS.brandOn};font-size:17px;font-weight:700;">S</td>
                    <td style="padding-left:10px;font-size:16px;font-weight:700;color:${EMAIL_COLORS.foreground};">SalaryFlow</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 32px 32px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:${EMAIL_COLORS.foreground};">${title}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${EMAIL_COLORS.muted};">Use this verification code to ${action}.</p>
                <div style="padding:20px;border-radius:10px;background:${EMAIL_COLORS.background};text-align:center;font-family:'Courier New',monospace;font-size:32px;font-weight:700;line-height:1;letter-spacing:8px;color:${EMAIL_COLORS.foreground};">${safeCode}</div>
                <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_COLORS.muted};">This code expires in ${expiresInMinutes} minutes. If you did not request it, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:${EMAIL_COLORS.subtle};">SalaryFlow account security</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export async function sendOtpEmail(options: OtpEmailOptions): Promise<MailResult> {
  const config = getMailConfig();
  if (!config) return { sent: false, reason: "not-configured" };

  const { subject, text, html } = createOtpEmail(options);
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transporter.sendMail({ from: config.from, to: options.to, subject, text, html });
    return { sent: true };
  } catch (error) {
    console.error(
      "[MAIL] OTP delivery failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { sent: false, reason: "delivery-failed" };
  }
}
