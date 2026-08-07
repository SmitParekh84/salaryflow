import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { SalaryProfileModel } from "@/server/models";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(1),
  amount: z.number().nonnegative(),
  salaryDay: z.number().min(1).max(31),
  cycle: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().optional(),
  savingsGoal: z.number().optional(),
  emergencyFundGoal: z.number().optional(),
  investmentAmount: z.number().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await connectDB();
  const prof = await SalaryProfileModel.findOne({ userId }).lean();
  return NextResponse.json({ data: prof });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  await connectDB();
  const up = await SalaryProfileModel.findOneAndUpdate({ userId: parsed.data.userId }, parsed.data, { upsert: true, new: true }).lean();
  return NextResponse.json({ data: up });
}
