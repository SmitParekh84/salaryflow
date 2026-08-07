import { connectDB } from "@/server/db";
import { ExpenseModel } from "@/server/models";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  merchant: z.string().optional(),
  paymentMethod: z.string().default("UPI"),
  note: z.string().optional(),
  date: z.string().optional(),
  recurring: z.boolean().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    await connectDB();
    const expenses = await ExpenseModel.find({ userId })
      .sort({ date: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({ data: expenses });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    await connectDB();
    const updated = await ExpenseModel.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await connectDB();
    const removed = await ExpenseModel.findByIdAndDelete(id).lean();
    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: removed });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "server error" }, { status: 500 });
  }
}
