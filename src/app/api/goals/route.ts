import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { GoalModel } from "@/server/models";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({ userId: z.string().min(1), name: z.string().min(1), type: z.string().optional(), target: z.number().positive(), saved: z.number().optional(), monthlyContribution: z.number().optional(), deadline: z.string().optional() });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await connectDB();
  const goals = await GoalModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: goals });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  await connectDB();
  const created = await GoalModel.create(parsed.data);
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PUT(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  await connectDB();
  const updated = await GoalModel.findByIdAndUpdate(id, body, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await connectDB();
  const removed = await GoalModel.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: removed });
}
