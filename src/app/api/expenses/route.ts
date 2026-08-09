import { getAuthenticatedContext, isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { connectDB } from "@/server/db";
import { ExpenseModel } from "@/server/models";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  merchant: z.string().optional(),
  paymentMethod: z.string().default("UPI"),
  note: z.string().optional(),
  date: z.string().optional(),
  recurring: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export async function GET() {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const expenses = await ExpenseModel.find({ userId: auth.userId })
      .sort({ date: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({ data: expenses });
  } catch {
    return NextResponse.json({ error: "Unable to load expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    await connectDB();
    const created = await ExpenseModel.create({
      ...parsed.data,
      userId: auth.userId,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create expense" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  try {
    await connectDB();
    const updated = await ExpenseModel.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      parsed.data,
      { new: true },
    ).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Unable to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Valid id required" }, { status: 400 });
  }
  try {
    await connectDB();
    const removed = await ExpenseModel.findOneAndDelete({ _id: id, userId: auth.userId }).lean();
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: removed });
  } catch {
    return NextResponse.json({ error: "Unable to delete expense" }, { status: 500 });
  }
}
