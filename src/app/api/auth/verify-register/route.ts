import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { OtpModel, UserModel, SalaryProfileModel, ExpenseModel, BillModel, GoalModel, InvestmentModel } from "@/server/models";
import { hashPassword, signJwt } from "@/server/auth";
import { z } from "zod";
import { seedProfile, seedExpenses, seedBills, seedGoals, seedInvestments } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email(), password: z.string().min(6), otp: z.string().length(6), name: z.string().optional() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  await connectDB();
  const otpRow = await OtpModel.findOne({ email: parsed.data.email, code: parsed.data.otp, used: false }).sort({ createdAt: -1 }).lean();
  if (!otpRow) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  if (new Date(otpRow.expiresAt) < new Date()) return NextResponse.json({ error: "OTP expired" }, { status: 400 });

  // mark used
  await OtpModel.updateOne({ _id: otpRow._id }, { used: true }).catch(() => null);

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
  } catch (e) {
    // ignore
  }

  const token = signJwt({ sub: String(created._id), email: created.email });
  const cookie = `sf_session=${token}; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Path=/; SameSite=Lax`;
  const res = NextResponse.json({ data: { id: created._id, email: created.email, name: created.name } }, { status: 201 });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
