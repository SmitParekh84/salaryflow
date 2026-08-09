import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import { BankAccountModel } from "@/server/models";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accountSchema = z.object({
  bankName: z.string().trim().min(1),
  accountType: z.enum(["Savings", "Salary", "Current", "Other"]),
  balance: z.number().nonnegative(),
  status: z.enum(["active", "closing"]).default("active"),
  plannedTransferTo: z.string().trim().min(1).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.email || String(user._id);
  const accounts = await BankAccountModel.find({ userId }).sort({ status: 1, bankName: 1 }).lean();
  return NextResponse.json({ data: accounts });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const body = await req.json().catch(() => null);
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid account details" }, { status: 422 });
  }

  const userId = user.email || String(user._id);
  const created = await BankAccountModel.create({ ...parsed.data, userId });
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Valid account id is required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = accountSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid account details" }, { status: 422 });
  }

  const userId = user.email || String(user._id);
  const updated = await BankAccountModel.findOneAndUpdate({ _id: id, userId }, parsed.data, {
    new: true,
  }).lean();
  if (!updated) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Valid account id is required" }, { status: 400 });

  const userId = user.email || String(user._id);
  const removed = await BankAccountModel.findOneAndDelete({ _id: id, userId }).lean();
  if (!removed) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ data: removed });
}
