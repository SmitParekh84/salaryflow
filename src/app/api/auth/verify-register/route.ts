import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session-cookie";
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { OtpModel, UserModel, SalaryProfileModel, ExpenseModel, BillModel, GoalModel, InvestmentModel } from "@/server/models";
import { hashOtp, hashPassword, signJwt } from "@/server/auth";
import { z } from "zod";
import { seedProfile, seedExpenses, seedBills, seedGoals, seedInvestments } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  otp: z.string().regex(/^\d{6}$/),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  const ipLimit = await consumeRateLimit({ scope: "register-verify-ip", identifier: getClientIp(req), limit: 20, windowMs: 10 * 60 * 1000 });
  const emailLimit = await consumeRateLimit({ scope: "register-verify-email", identifier: parsed.data.email, limit: 5, windowMs: 10 * 60 * 1000 });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
    return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  await connectDB();
  const otpRow = await OtpModel.findOneAndUpdate(
    { email: parsed.data.email, code: hashOtp(parsed.data.email, parsed.data.otp), used: false, expiresAt: { $gt: new Date() } },
    { used: true },
    { new: true, sort: { createdAt: -1 } },
  ).lean();
  if (!otpRow) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  const existing = await UserModel.findOne({ email: parsed.data.email }).lean();
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await UserModel.create({ email: parsed.data.email, name: parsed.data.name, passwordHash, emailVerified: true });

  // seed default profile and demo data for new user
  const userId = created.email || String(created._id);
  try {
    await SalaryProfileModel.create({ ...seedProfile, userId });
    const expenses = seedExpenses().map((e) => ({ ...e, userId }));
    const bills = seedBills().map((b) => ({ ...b, userId }));
    const goals = seedGoals().map((g) => ({ ...g, userId }));
    const investments = seedInvestments().map((i) => ({ ...i, userId }));
    await ExpenseModel.insertMany(expenses, { ordered: false }).catch(() => null);
    await BillModel.insertMany(bills, { ordered: false }).catch(() => null);
    await GoalModel.insertMany(goals, { ordered: false }).catch(() => null);
    await InvestmentModel.insertMany(investments, { ordered: false }).catch(() => null);
  } catch {
    // ignore
  }

  const token = signJwt({ sub: String(created._id), email: created.email, sv: 0 }, "7d");
  const res = NextResponse.json({ data: { id: created._id, email: created.email, name: created.name } }, { status: 201 });
  setSessionCookie(res, token, true);
  await clearRateLimit("register-verify-email", parsed.data.email);
  return res;
}
