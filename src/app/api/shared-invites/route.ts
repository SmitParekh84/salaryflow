import { verifyJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { SharedExpenseInviteModel, UserModel } from "@/server/models";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const inviteSchema = z.object({
  friendName: z.string().trim().min(1),
  friendEmail: z.string().trim().toLowerCase().email(),
  title: z.string().trim().min(1),
  expenseDate: z.string().datetime(),
  totalAmount: z.number().positive(),
  ownerPaid: z.number().nonnegative(),
  friendPaid: z.number().nonnegative(),
});

async function authenticatedUser(request: Request) {
  const token = request.headers.get("cookie")?.match(/sf_session=([^;]+)/)?.[1];
  const payload = token ? verifyJwt(token) : null;
  if (!payload || typeof payload !== "object" || !("sub" in payload) || !payload.sub) return null;
  await connectDB();
  return UserModel.findById(payload.sub).lean();
}

export async function POST(request: Request) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid invitation" }, { status: 400 });
  }

  const ownerId = user.email || String(user._id);
  const recipient = await UserModel.findOne({ email: parsed.data.friendEmail }).select("_id").lean();
  const invite = await SharedExpenseInviteModel.findOneAndUpdate(
    {
      ownerId,
      friendEmail: parsed.data.friendEmail,
      title: parsed.data.title,
      expenseDate: new Date(parsed.data.expenseDate),
    },
    {
      ...parsed.data,
      ownerId,
      recipientUserId: recipient ? String(recipient._id) : undefined,
      expenseDate: new Date(parsed.data.expenseDate),
      status: "pending",
    },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json({ data: invite }, { status: 201 });
}