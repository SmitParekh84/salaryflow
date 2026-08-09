import { verifyJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { SalaryHistoryModel, SalaryProfileModel, UserModel } from "@/server/models";
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

async function getUserFromReq(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sf_session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload || typeof payload !== "object" || !("sub" in payload) || !payload.sub) return null;
  await connectDB();
  const user = await UserModel.findById(payload.sub).lean();
  return user;
}

export async function GET(req: Request) {
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const items = await SalaryHistoryModel.find({ userId: user.email || String(user._id) })
    .sort({ date: -1 })
    .lean();
  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
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
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await connectDB();
  const existing = await SalaryHistoryModel.findById(id).lean();
  if (!existing || existing.userId !== (user.email || String(user._id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const removed = await SalaryHistoryModel.findByIdAndDelete(id).lean();
  return NextResponse.json({ data: removed });
}
