import { getAuthenticatedContext, isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { BillModel } from "@/server/models";
import { Types } from "mongoose";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().min(1), amount: z.number().nonnegative(), dueDate: z.string().optional(), frequency: z.string().optional(), paid: z.boolean().optional(), note: z.string().optional() });

export async function GET() {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const bills = await BillModel.find({ userId: auth.userId }).sort({ dueDate: 1 }).lean();
    return NextResponse.json({ data: bills });
  } catch {
    return NextResponse.json({ error: "Unable to load bills" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  try {
    await connectDB();
    const created = await BillModel.create({ ...parsed.data, userId: auth.userId });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create bill" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = schema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });
  try {
    await connectDB();
    const updated = await BillModel.findOneAndUpdate({ _id: id, userId: auth.userId }, parsed.data, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Unable to update bill" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  try {
    await connectDB();
    const removed = await BillModel.findOneAndDelete({ _id: id, userId: auth.userId }).lean();
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: removed });
  } catch {
    return NextResponse.json({ error: "Unable to delete bill" }, { status: 500 });
  }
}
