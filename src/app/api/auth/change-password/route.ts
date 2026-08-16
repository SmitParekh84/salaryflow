import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/server-auth";
import { SESSION_TTL_SECONDS, sessionTokenExpiry, setSessionCookie } from "@/lib/session-cookie";
import { hashPassword, signJwt, verifyPassword } from "@/server/auth";
import { connectDB } from "@/server/db";
import { DEMO_EMAIL } from "@/server/demo-seed";
import { UserModel } from "@/server/models";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Change the signed-in user's password.
 *
 * The session already proves who this is, so no OTP is involved — but the
 * current password is still required. Without it, anyone who reaches an
 * unlocked, unattended device could take the account over permanently, which
 * is a much worse outcome than reading the balances already on screen.
 *
 * Succeeding bumps `sessionVersion`, which invalidates every token minted
 * before now: changing a password is how you evict someone, so leaving other
 * devices signed in would defeat the point. This device is then re-issued a
 * cookie, so the person doing the change is not signed out of the tab they are
 * standing in.
 */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 422 },
    );
  }

  // The demo login is shared by everyone trying the product. A password change
  // there locks out every future visitor, so it is refused outright.
  if (current.email === DEMO_EMAIL) {
    return NextResponse.json(
      { error: "The demo account's password cannot be changed." },
      { status: 403 },
    );
  }

  // Bounded per account, not per IP: this endpoint needs a valid session, so
  // the attacker worth stopping is one sitting at an unlocked device guessing
  // the current password.
  const attempts = await consumeRateLimit({
    scope: "change-password",
    identifier: String(current._id),
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!attempts.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(attempts.retryAfterSeconds) } },
    );
  }

  await connectDB();
  const user = await UserModel.findById(current._id).select("+sessionVersion");
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "This account has no password to change." },
      { status: 400 },
    );
  }

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "That is not your current password." }, { status: 401 });
  }

  user.passwordHash = await hashPassword(parsed.data.newPassword);
  user.sessionVersion = Number(user.sessionVersion ?? 0) + 1;
  await user.save();

  const token = signJwt(
    { sub: String(user._id), email: user.email, sv: user.sessionVersion },
    sessionTokenExpiry(SESSION_TTL_SECONDS),
  );
  const res = NextResponse.json({ data: { signedOutOtherDevices: true } });
  setSessionCookie(res, token);
  await clearRateLimit("change-password", String(current._id));
  return res;
}
