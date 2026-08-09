import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import {
  AccountTransferModel,
  BankAccountModel,
  BillModel,
  BudgetRuleModel,
  CreditCardModel,
  ExpenseModel,
  GoalModel,
  IncomeModel,
  InvestmentModel,
  RecycleBinModel,
  SalaryProfileModel,
  UserModel,
} from "@/server/models";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getServerState(userId: string) {
  const [
    profile,
    expenses,
    incomes,
    bills,
    goals,
    investments,
    accounts,
    accountTransfers,
    creditCards,
    budgetRules,
    recycleBin,
  ] = await Promise.all([
    SalaryProfileModel.findOne({ userId }).lean(),
    ExpenseModel.find({ userId }).lean(),
    IncomeModel.find({ userId }).lean(),
    BillModel.find({ userId }).lean(),
    GoalModel.find({ userId }).lean(),
    InvestmentModel.find({ userId }).lean(),
    BankAccountModel.find({ userId }).lean(),
    AccountTransferModel.find({ userId }).sort({ date: -1 }).lean(),
    CreditCardModel.find({ userId }).lean(),
    BudgetRuleModel.find({ userId }).lean(),
    RecycleBinModel.find({ userId }).sort({ deletedAt: -1 }).lean(),
  ]);

  return {
    profile,
    expenses,
    incomes,
    bills,
    goals,
    investments,
    accounts,
    accountTransfers,
    creditCards,
    budgetRules,
    recycleBin,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.email || String(user._id);
  return NextResponse.json({ data: await getServerState(userId) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid sync payload" }, { status: 422 });

  const userId = user.email || String(user._id);

  if (body.onboardingCompleted === true) {
    await UserModel.updateOne({ _id: user._id }, { onboardingCompleted: true });
  }

  // upsert profile
  if (body.profile) {
    await SalaryProfileModel.findOneAndUpdate(
      { userId },
      { ...body.profile, userId },
      { upsert: true, new: true },
    );
  }

  // replace collections for user
  const collections = [
    { model: ExpenseModel, items: body.expenses || [] },
    { model: IncomeModel, items: body.incomes || [] },
    { model: BillModel, items: body.bills || [] },
    { model: GoalModel, items: body.goals || [] },
    { model: InvestmentModel, items: body.investments || [] },
    { model: BankAccountModel, items: body.accounts || [] },
    { model: AccountTransferModel, items: body.accountTransfers || [] },
    { model: CreditCardModel, items: body.creditCards || [] },
    { model: BudgetRuleModel, items: body.budgetRules || [] },
    { model: RecycleBinModel, items: body.recycleBin || [] },
  ];

  for (const entry of collections) {
    await entry.model.deleteMany({ userId });
    if (Array.isArray(entry.items) && entry.items.length > 0) {
      const docs = entry.items.map((item: unknown) => {
        const copy = { ...(item as Record<string, unknown>) };
        const rawId = copy._id ?? copy.id;
        delete copy.id;
        delete copy._id;
        if (typeof rawId === "string" && /^[a-f\d]{24}$/i.test(rawId)) {
          copy._id = rawId;
        }
        copy.userId = userId;
        return copy;
      });
      await entry.model.insertMany(docs, { ordered: false }).catch(() => null);
    }
  }

  // return merged server state
  return NextResponse.json({ data: await getServerState(userId) });
}
