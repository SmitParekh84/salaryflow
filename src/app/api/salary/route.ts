import { getAuthenticatedContext, isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { connectDB } from "@/server/db";
import { SalaryProfileModel } from "@/server/models";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.number().nonnegative(),
  salaryDay: z.number().min(1).max(31),
  cycle: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().optional(),
  savingsGoal: z.number().optional(),
  emergencyFundGoal: z.number().optional(),
  investmentAmount: z.number().optional(),
});

export async function GET() {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const prof = await SalaryProfileModel.findOne({ userId: auth.userId }).lean();
    return NextResponse.json({ data: prof });
  } catch {
    return NextResponse.json({ error: "Unable to load salary profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  try {
    await connectDB();
    const up = await SalaryProfileModel.findOneAndUpdate(
      { userId: auth.userId },
      { ...parsed.data, userId: auth.userId },
      { upsert: true, new: true },
    ).lean();
    return NextResponse.json({ data: up });
  } catch {
    return NextResponse.json({ error: "Unable to save salary profile" }, { status: 500 });
  }
}
