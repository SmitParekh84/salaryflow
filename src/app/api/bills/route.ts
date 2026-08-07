import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { BillModel } from "@/server/models";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ userId: z.string().min(1), name: z.string().min(1), amount: z.number().nonnegative(), dueDate: z.string().optional(), frequency: z.string().optional(), paid: z.boolean().optional(), note: z.string().optional() });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await connectDB();
  const bills = await BillModel.find({ userId }).sort({ dueDate: 1 }).lean();
  return NextResponse.json({ data: bills });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  await connectDB();
  const created = await BillModel.create(parsed.data);
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PUT(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  await connectDB();
  const updated = await BillModel.findByIdAndUpdate(id, body, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await connectDB();
  const removed = await BillModel.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: removed });
}
