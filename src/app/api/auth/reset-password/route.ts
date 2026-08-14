import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { SESSION_TTL_SECONDS, sessionTokenExpiry, setSessionCookie } from "@/lib/session-cookie";
import { hashOtp, hashPassword, signJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { OtpModel, UserModel } from "@/server/models";
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
  otp: z.string().regex(/^\d{6}$/),
  password: z.string().min(12).max(128),
});

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  const ipLimit = await consumeRateLimit({
    scope: "reset-verify-ip",
    identifier: getClientIp(req),
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  const emailLimit = await consumeRateLimit({
    scope: "reset-verify-email",
    identifier: parsed.data.email,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
    return NextResponse.json(
      { error: "Too many verification attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  await connectDB();
  const otpRow = await OtpModel.findOneAndUpdate(
    {
      email: parsed.data.email,
      code: hashOtp(parsed.data.email, parsed.data.otp),
      used: false,
      expiresAt: { $gt: new Date() },
    },
    { used: true },
    { new: true, sort: { createdAt: -1 } },
  ).lean();
  if (!otpRow) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  const user = await UserModel.findOne({ email: parsed.data.email }).select("+sessionVersion");
  if (!user) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);
  user.passwordHash = passwordHash;
  user.sessionVersion = Number(user.sessionVersion ?? 0) + 1;
  await user.save();

  const token = signJwt(
    { sub: String(user._id), email: user.email, sv: user.sessionVersion },
    sessionTokenExpiry(SESSION_TTL_SECONDS),
  );
  const res = NextResponse.json({ data: { id: user._id, email: user.email, name: user.name } });
  setSessionCookie(res, token);
  await clearRateLimit("reset-verify-email", parsed.data.email);
  return res;
}
