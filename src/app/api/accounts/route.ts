import { verifyJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { BankAccountModel, UserModel } from "@/server/models";
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

async function getUser(req: Request) {
  const token = req.headers.get("cookie")?.match(/sf_session=([^;]+)/)?.[1];
  if (!token) return null;

  const payload = verifyJwt(token);
  if (!payload || typeof payload !== "object" || !("sub" in payload) || !payload.sub) {
    return null;
  }

  await connectDB();
  return UserModel.findById(payload.sub).lean();
}

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.email || String(user._id);
  const accounts = await BankAccountModel.find({ userId }).sort({ status: 1, bankName: 1 }).lean();
  return NextResponse.json({ data: accounts });
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Account id is required" }, { status: 400 });

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
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Account id is required" }, { status: 400 });

  const userId = user.email || String(user._id);
  const removed = await BankAccountModel.findOneAndDelete({ _id: id, userId }).lean();
  if (!removed) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ data: removed });
}
