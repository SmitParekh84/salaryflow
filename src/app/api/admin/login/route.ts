import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session-cookie";
import { signJwt, verifyPassword } from "@/server/auth";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Console sign-in.
 *
 * Separate from `/api/auth/login` because the console is operator tooling, not
 * a product surface: it refuses any account without `isAdmin`, and never issues
 * a long-lived "remember me" session. Failing an admin check and failing a
 * password return the same message and the same status, so this endpoint cannot
 * be used to enumerate which accounts hold admin rights.
 */
const schema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("spendly-invalid-password", 10);
const INVALID = { error: "Invalid credentials" };

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  // Tighter than the app's limits — the console has a handful of legitimate
  // users, so there is no reason to tolerate volume against it.
  const ipLimit = await consumeRateLimit({
    scope: "admin-login-ip",
    identifier: getClientIp(req),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const accountLimit = await consumeRateLimit({
    scope: "admin-login-account",
    identifier: parsed.data.email,
    limit: 5,
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

  // Always run the comparison, even with no user, so response time does not
  // reveal whether the address exists.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user || !user.passwordHash || !ok) return NextResponse.json(INVALID, { status: 401 });
  if (!user.isAdmin) return NextResponse.json(INVALID, { status: 401 });

  const token = signJwt(
    { sub: String(user._id), email: user.email, sv: Number(user.sessionVersion ?? 0) },
    "12h",
  );

  const res = NextResponse.json({
    data: { id: user._id, email: user.email, name: user.name },
  });
  setSessionCookie(res, token, false);
  await clearRateLimit("admin-login-account", parsed.data.email);
  return res;
}
