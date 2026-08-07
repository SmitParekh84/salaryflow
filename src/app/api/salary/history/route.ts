import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { SalaryHistoryModel, UserModel } from "@/server/models";
import { verifyJwt } from "@/server/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({ amount: z.number().nonnegative(), date: z.string().optional(), source: z.string().optional(), note: z.string().optional(), confirmed: z.boolean().optional() });

async function getUserFromReq(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sf_session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null as any;
  const payload = verifyJwt(token) as any;
  if (!payload?.sub) return null as any;
  await connectDB();
  const user = await UserModel.findById(payload.sub).lean();
  return user as any;
}

export async function GET(req: Request) {
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const items = await SalaryHistoryModel.find({ userId: user.email || String(user._id) }).sort({ date: -1 }).lean();
  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  await connectDB();
  const created = await SalaryHistoryModel.create({
    userId: user.email || String(user._id),
    amount: parsed.data.amount,
    date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    source: parsed.data.source || "salary",
    confirmed: !!parsed.data.confirmed,
    note: parsed.data.note,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await connectDB();
  const existing = await SalaryHistoryModel.findById(id).lean();
  if (!existing || existing.userId !== (user.email || String(user._id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await SalaryHistoryModel.findByIdAndUpdate(id, body, { new: true }).lean();
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
  if (!existing || existing.userId !== (user.email || String(user._id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const removed = await SalaryHistoryModel.findByIdAndDelete(id).lean();
  return NextResponse.json({ data: removed });
}
