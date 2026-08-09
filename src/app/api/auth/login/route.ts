import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session-cookie";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { verifyPassword, signJwt } from "@/server/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional(),
});

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("salaryflow-invalid-password", 10);

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const ipLimit = await consumeRateLimit({
    scope: "login-ip",
    identifier: getClientIp(req),
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  const accountLimit = await consumeRateLimit({
    scope: "login-account",
    identifier: parsed.data.email,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.allowed || !accountLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds);
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  await connectDB();
  const user = await UserModel.findOne({ email: parsed.data.email }).select("+sessionVersion").lean();
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user || !user.passwordHash || !ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const remember = !!parsed.data.remember;
  const token = signJwt(
    { sub: String(user._id), email: user.email, sv: Number(user.sessionVersion ?? 0) },
    remember ? "7d" : "12h",
  );

  const res = NextResponse.json({ data: { id: user._id, email: user.email, name: user.name } });
  setSessionCookie(res, token, remember);
  await clearRateLimit("login-account", parsed.data.email);
  return res;
}
