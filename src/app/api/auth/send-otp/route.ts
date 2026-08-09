import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateOtp, hashOtp } from "@/server/auth";
import { connectDB } from "@/server/db";
import { sendOtpEmail } from "@/server/mail";
import { OtpModel } from "@/server/models";
import { NextResponse } from "next/server";
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
    scope: "register-otp-ip",
    identifier: getClientIp(req),
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  const emailLimit = await consumeRateLimit({
    scope: "register-otp-email",
    identifier: parsed.data.email,
    limit: 3,
    windowMs: 10 * 60 * 1000,
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
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes
  await OtpModel.updateMany({ email: parsed.data.email, used: false }, { used: true });
  await OtpModel.create({
    email: parsed.data.email,
    code: hashOtp(parsed.data.email, code),
    expiresAt,
  });

  const delivery = await sendOtpEmail({
    to: parsed.data.email,
    code,
    purpose: "register",
    expiresInMinutes: 10,
  });
  if (!delivery.sent) {
    await OtpModel.deleteMany({ email: parsed.data.email, used: false });
    return NextResponse.json(
      {
        error:
          delivery.reason === "not-configured" && process.env.NODE_ENV !== "production"
            ? "Email delivery is not configured. Add the SMTP settings to .env.local and restart the server."
            : "Verification email is temporarily unavailable. Check the address and try again.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    data: { message: "If the address can receive mail, a code was sent" },
  });
}
