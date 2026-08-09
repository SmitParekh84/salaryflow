import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import {
  AccountTransferModel,
  AdminAuditModel,
  BankAccountModel,
  BillModel,
  BudgetRuleModel,
  CreditCardModel,
  ExpenseModel,
  GoalModel,
  IncomeModel,
  InvestmentModel,
  NotificationModel,
  OtpModel,
  RecycleBinModel,
  SalaryHistoryModel,
  SalaryProfileModel,
  SharedExpenseInviteModel,
  UserModel,
} from "@/server/models";
import mongoose, { Types } from "mongoose";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ isAdmin: z.boolean() });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requester.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  await connectDB();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  if (id === String(requester._id) && !parsed.data.isAdmin) {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 409 });
  }

  const target = await UserModel.findById(id).lean();
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.isAdmin && !parsed.data.isAdmin) {
    const adminCount = await UserModel.countDocuments({ isAdmin: true });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "At least one administrator is required" }, { status: 409 });
    }
  }

  const updated = await UserModel.findByIdAndUpdate(id, { isAdmin: parsed.data.isAdmin }, { new: true }).lean();
  await AdminAuditModel.create({
    adminId: String(requester._id),
    targetUserId: id,
    action: parsed.data.isAdmin ? "promote" : "demote",
  });
  return NextResponse.json({ data: { id: String(updated._id), isAdmin: Boolean(updated.isAdmin) } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requester.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  await connectDB();

  if (id === String(requester._id)) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 409 });
  }

  const target = await UserModel.findById(id).lean();
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.isAdmin) {
    const adminCount = await UserModel.countDocuments({ isAdmin: true });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "At least one administrator is required" }, { status: 409 });
    }
  }

  const ownershipIds = [target.email, String(target._id)];
  const ownedModels = [
    ExpenseModel,
    IncomeModel,
    SalaryProfileModel,
    BillModel,
    GoalModel,
    InvestmentModel,
    BankAccountModel,
    AccountTransferModel,
    CreditCardModel,
    BudgetRuleModel,
    RecycleBinModel,
    NotificationModel,
    SalaryHistoryModel,
  ];

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const model of ownedModels) {
        await model.deleteMany({ userId: { $in: ownershipIds } }, { session });
      }
      await SharedExpenseInviteModel.deleteMany(
        {
          $or: [
            { ownerId: { $in: ownershipIds } },
            { recipientUserId: { $in: ownershipIds } },
            { friendEmail: target.email },
          ],
        },
        { session },
      );
      await OtpModel.deleteMany({ email: target.email }, { session });
      await UserModel.deleteOne({ _id: target._id }, { session });
      await AdminAuditModel.create(
        [{ adminId: String(requester._id), targetUserId: id, action: "delete" }],
        { session },
      );
    });
  } catch {
    return NextResponse.json({ error: "Unable to delete this account safely" }, { status: 500 });
  } finally {
    await session.endSession();
  }

  return NextResponse.json({ data: { id } });
}
