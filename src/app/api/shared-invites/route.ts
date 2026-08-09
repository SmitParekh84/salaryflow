import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import { NotificationModel, SharedExpenseInviteModel, UserModel } from "@/server/models";
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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(request))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid invitation" },
      { status: 400 },
    );
  }

  const ownerId = user.email || String(user._id);
  const recipient = await UserModel.findOne({ email: parsed.data.friendEmail })
    .select("_id email")
    .lean();
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

  if (recipient?.email) {
    await NotificationModel.findOneAndUpdate(
      {
        userId: recipient.email,
        dedupeKey: `shared-invite:${String(invite._id)}`,
      },
      {
        $setOnInsert: {
          userId: recipient.email,
          title: "Shared spending invite",
          body: `${user.name || user.email} invited you to review ${parsed.data.title}.`,
          type: "shared",
          href: "/shared",
          read: false,
          dedupeKey: `shared-invite:${String(invite._id)}`,
        },
      },
      { upsert: true, new: true },
    );
  }

  return NextResponse.json({ data: invite }, { status: 201 });
}
