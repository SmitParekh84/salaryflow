import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { hashOtp, hashPassword } from "@/server/auth";
import { connectDB } from "@/server/db";
import { sendAdminSignupEmail } from "@/server/mail";
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
  password: z.string().min(12).max(128),
  otp: z.string().regex(/^\d{6}$/),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  const ipLimit = await consumeRateLimit({
    scope: "register-verify-ip",
    identifier: getClientIp(req),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  const emailLimit = await consumeRateLimit({
    scope: "register-verify-email",
    identifier: parsed.data.email,
    limit: 5,
    windowMs: 10 * 60 * 1000,
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

  const existing = await UserModel.findOne({ email: parsed.data.email }).lean();
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await UserModel.create({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
    emailVerified: true,
    onboardingCompleted: false,
    approvalStatus: "pending",
  });

  /*
   * No session is signed here, and that is the point of the whole change.
   * This route used to mint a JWT and set the cookie the moment the OTP
   * checked out, which let a brand new account straight into the app. The
   * account now exists but cannot be used until an admin approves it, so the
   * caller gets the status and sends the reader to /pending.
   *
   * The email is still verified above: the approval decision is delivered by
   * email, so an unverified address means an approval nobody ever receives.
   */
  await notifyAdmins({ email: created.email, name: created.name ?? null });

  await clearRateLimit("register-verify-email", parsed.data.email);
  return NextResponse.json(
    { data: { status: "pending", email: created.email, name: created.name ?? null } },
    { status: 201 },
  );
}

/**
 * Tells every admin that someone is waiting.
 *
 * Never throws. A signup that already succeeded must not report failure
 * because the mail provider is down or unconfigured — the account is created
 * either way and the console still shows it. Same tolerance the OTP send
 * already has, and the reason this is awaited rather than left dangling is
 * only that a serverless function can be frozen the moment it responds.
 */
async function notifyAdmins(signup: { email: string; name: string | null }) {
  try {
    const [admins, pendingCount] = await Promise.all([
      UserModel.find({ isAdmin: true }).select("email").lean(),
      UserModel.countDocuments({ approvalStatus: "pending" }),
    ]);
    const to = admins.map((admin) => admin.email).filter(Boolean);
    if (to.length === 0) return;

    await sendAdminSignupEmail({
      to,
      signupEmail: signup.email,
      signupName: signup.name,
      pendingCount,
    });
  } catch (error) {
    console.error(
      "[REGISTER] admin alert failed",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
