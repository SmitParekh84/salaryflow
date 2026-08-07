import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { OtpModel } from "@/server/models";
import { z } from "zod";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  await connectDB();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes
  await OtpModel.create({ email: parsed.data.email, code, expiresAt });

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
        subject: "Your SalaryFlow verification code",
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
      });
      sent = true;
    } catch (e) {
      // swallow and fallback to console
    }
  }

  // fallback: log code to server logs for dev
  if (!sent) console.log(`[OTP] ${parsed.data.email} -> ${code}`);

  return NextResponse.json({ data: { message: "OTP sent", method: sent ? "email" : "console" } });
}
