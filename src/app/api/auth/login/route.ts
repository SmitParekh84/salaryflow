import { accessDecision } from "@/lib/approval";
import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { sessionTokenExpiry, sessionTtlSeconds, setSessionCookie } from "@/lib/session-cookie";
import { signJwt, verifyPassword } from "@/server/auth";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import bcrypt from "bcryptjs";
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
  password: z.string().min(1).max(128),
  remember: z.boolean().optional(),
});

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("aartha-invalid-password", 10);

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
  const user = await UserModel.findOne({ email: parsed.data.email })
    .select("+sessionVersion")
    .lean();
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user || !user.passwordHash || !ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  /*
   * The approval gate, and it has to sit here rather than earlier.
   *
   * Checking before the password would turn this endpoint into an
   * account-existence oracle: anyone could tell a real pending address from an
   * unknown one without knowing a password. Behind the password check, the only
   * person who learns anything is the account owner.
   *
   * The "absent means approved" rule lives in lib/approval.ts, with the test
   * that stops it being inverted.
   */
  const access = accessDecision(user.approvalStatus);
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const remember = !!parsed.data.remember;
  const maxAge = sessionTtlSeconds(remember);
  const token = signJwt(
    { sub: String(user._id), email: user.email, sv: Number(user.sessionVersion ?? 0) },
    sessionTokenExpiry(maxAge),
  );

  const onboardingCompleted =
    typeof user.onboardingCompleted === "boolean" ? user.onboardingCompleted : true;
  const res = NextResponse.json({
    data: { id: user._id, email: user.email, name: user.name, onboardingCompleted },
  });
  setSessionCookie(res, token, maxAge);
  await clearRateLimit("login-account", parsed.data.email);
  return res;
}
