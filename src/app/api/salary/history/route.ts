import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import { connectDB } from "@/server/db";
import { SalaryHistoryModel, SalaryProfileModel } from "@/server/models";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  amount: z.number().positive(),
  date: z.string(),
  source: z.string().optional(),
  note: z.string().max(300).optional(),
  confirmed: z.boolean().optional(),
});

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  note: z.string().max(300).optional(),
  confirmed: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const items = await SalaryHistoryModel.find({ userId: user.email || String(user._id) })
    .sort({ date: -1 })
    .lean();
  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  await connectDB();
  const userId = user.email || String(user._id);
  const profile = await SalaryProfileModel.findOne({ userId }).lean();
  const baseAmount = profile?.amount ?? 0;
  const varianceAmount = parsed.data.amount - baseAmount;
  const date = new Date(parsed.data.date);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const salary = await SalaryHistoryModel.findOneAndUpdate(
    { userId, date: { $gte: monthStart, $lt: monthEnd } },
    {
      userId,
      amount: parsed.data.amount,
      date,
      source: "salary",
      confirmed: !!parsed.data.confirmed,
      note: parsed.data.note,
      baseAmount,
      varianceAmount,
      varianceKind: varianceAmount > 0 ? "allowance" : varianceAmount < 0 ? "deduction" : "none",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return NextResponse.json({ data: salary }, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  await connectDB();
  const existing = await SalaryHistoryModel.findById(id).lean();
  if (!existing || existing.userId !== (user.email || String(user._id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await SalaryHistoryModel.findByIdAndUpdate(id, parsed.data, {
    returnDocument: "after",
  }).lean();
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  await connectDB();
  const existing = await SalaryHistoryModel.findById(id).lean();
  if (!existing || existing.userId !== (user.email || String(user._id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const removed = await SalaryHistoryModel.findByIdAndDelete(id).lean();
  return NextResponse.json({ data: removed });
}
