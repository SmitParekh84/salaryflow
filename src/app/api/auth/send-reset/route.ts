import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateOtp, hashOtp } from "@/server/auth";
import { connectDB } from "@/server/db";
import { OtpModel } from "@/server/models";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
});

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  const ipLimit = await consumeRateLimit({
    scope: "reset-otp-ip",
    identifier: getClientIp(req),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const emailLimit = await consumeRateLimit({
    scope: "reset-otp-email",
    identifier: parsed.data.email,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
    return NextResponse.json(
      { error: "Too many code requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  await connectDB();
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
  await OtpModel.updateMany({ email: parsed.data.email, used: false }, { used: true });
  await OtpModel.create({
    email: parsed.data.email,
    code: hashOtp(parsed.data.email, code),
    expiresAt,
  });

  // attempt to send email if SMTP configured
  const smtpHost = process.env.SMTP_HOST;
  let sent = false;
  if (smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@salaryflow.app",
        to: parsed.data.email,
        subject: "Your SalaryFlow password reset code",
        text: `Your password reset code is ${code}. It expires in 15 minutes.`,
      });
      sent = true;
    } catch {
      // swallow and fallback to console
    }
  }

  if (!sent && process.env.NODE_ENV === "production") {
    await OtpModel.deleteMany({ email: parsed.data.email, used: false });
  }
  if (!sent && process.env.NODE_ENV !== "production") console.log(`[DEV RESET OTP] ${code}`);
  return NextResponse.json({ data: { message: "If an account exists, a reset code was sent" } });
}
