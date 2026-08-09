import { getAuthenticatedContext, isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { connectDB } from "@/server/db";
import { GoalModel } from "@/server/models";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  target: z.number().positive(),
  saved: z.number().optional(),
  monthlyContribution: z.number().optional(),
  deadline: z.string().optional(),
});

export async function GET() {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const goals = await GoalModel.find({ userId: auth.userId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: goals });
  } catch {
    return NextResponse.json({ error: "Unable to load goals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  try {
    await connectDB();
    const created = await GoalModel.create({ ...parsed.data, userId: auth.userId });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create goal" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  try {
    await connectDB();
    const updated = await GoalModel.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      parsed.data,
      { new: true },
    ).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Unable to update goal" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  try {
    await connectDB();
    const removed = await GoalModel.findOneAndDelete({ _id: id, userId: auth.userId }).lean();
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: removed });
  } catch {
    return NextResponse.json({ error: "Unable to delete goal" }, { status: 500 });
  }
}
