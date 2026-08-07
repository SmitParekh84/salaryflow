import { connectDB } from "@/server/db";
import { UserModel, SalaryProfileModel, ExpenseModel, BillModel, GoalModel, InvestmentModel } from "@/server/models";
import { seedProfile, seedExpenses, seedBills, seedGoals, seedInvestments } from "@/lib/seed";
import { hashPassword, signJwt } from "@/server/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().min(1).optional(), email: z.string().email(), password: z.string().min(6) });

function cookieString(name: string, val: string, opts: Record<string, any> = {}) {
  const parts = [`${name}=${val}`];
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  return parts.join("; ");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  await connectDB();
  const existing = await UserModel.findOne({ email: parsed.data.email }).lean();
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await UserModel.create({ email: parsed.data.email, name: parsed.data.name, passwordHash });

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
    // seeding should not block registration
  }

  const token = signJwt({ sub: String(created._id), email: created.email });
  const cookie = cookieString("sf_session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });

  const res = NextResponse.json({ data: { id: created._id, email: created.email, name: created.name } }, { status: 201 });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
