import { isSameOriginRequest } from "@/lib/api-security";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session-cookie";
import { signJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
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
  NotificationModel,
  RecycleBinModel,
  SalaryHistoryModel,
  SalaryProfileModel,
  SharedExpenseInviteModel,
  UserModel,
} from "@/server/models";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@gmail.com";

function buildDemoHistory(now = new Date()) {
  const currentFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const firstMonth = new Date(currentFyStartYear - 1, 3, 1);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const months: Date[] = [];

  for (
    const month = new Date(firstMonth);
    month < currentMonth;
    month.setMonth(month.getMonth() + 1)
  ) {
    months.push(new Date(month));
  }

  const salaryHistory = months.map((month, index) => {
    const inCurrentFy = month >= new Date(currentFyStartYear, 3, 1);
    const baseAmount = inCurrentFy ? 85000 : 78000;
    const allowance = index % 5 === 4 ? 2500 : 0;
    return {
      userId: DEMO_EMAIL,
      amount: baseAmount + allowance,
      date: new Date(month.getFullYear(), month.getMonth(), 25),
      source: "salary",
      confirmed: true,
      baseAmount,
      varianceAmount: allowance,
      varianceKind: allowance ? "allowance" : "none",
    };
  });

  const expenses = months.flatMap((month, index) => {
    const date = (day: number) => new Date(month.getFullYear(), month.getMonth(), day);
    const rent = month >= new Date(currentFyStartYear, 3, 1) ? 22000 : 20000;
    return [
      {
        userId: DEMO_EMAIL,
        amount: rent,
        category: "Rent",
        merchant: "Landlord",
        paymentMethod: "Bank Transfer",
        date: date(1),
        recurring: true,
      },
      {
        userId: DEMO_EMAIL,
        amount: 3100 + (index % 4) * 260,
        category: "Groceries",
        merchant: "BigBasket",
        paymentMethod: "UPI",
        date: date(6),
      },
      {
        userId: DEMO_EMAIL,
        amount: 1550 + (index % 3) * 175,
        category: "Utilities",
        merchant: "Electricity Board",
        paymentMethod: "UPI",
        date: date(11),
        recurring: true,
      },
      {
        userId: DEMO_EMAIL,
        amount: 499,
        category: "Subscriptions",
        merchant: "Netflix",
        paymentMethod: "Card",
        date: date(14),
        recurring: true,
      },
      {
        userId: DEMO_EMAIL,
        amount: 1250 + (index % 5) * 140,
        category: "Food",
        merchant: "Swiggy",
        paymentMethod: "UPI",
        date: date(18),
      },
      {
        userId: DEMO_EMAIL,
        amount: 780 + (index % 4) * 95,
        category: "Travel",
        merchant: "Uber",
        paymentMethod: "UPI",
        date: date(21),
      },
      {
        userId: DEMO_EMAIL,
        amount: 1700 + (index % 6) * 230,
        category: "Shopping",
        merchant: "Myntra",
        paymentMethod: "Card",
        date: date(23),
      },
    ];
  });

  const incomes = months.flatMap((month, index) =>
    index % 3 === 2
      ? [
          {
            userId: DEMO_EMAIL,
            amount: 4500 + index * 150,
            type: "Freelance",
            source: "Design project",
            date: new Date(month.getFullYear(), month.getMonth(), 16),
          },
        ]
      : [],
  );

  return { expenses, incomes, salaryHistory };
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = await consumeRateLimit({
    scope: "demo-ip",
    identifier: getClientIp(request),
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demo limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  await connectDB();
  const user = await UserModel.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        name: "Demo User",
        emailVerified: true,
        onboardingCompleted: true,
        isAdmin: false,
      },
      $setOnInsert: { email: DEMO_EMAIL },
    },
    { upsert: true, new: true },
  ).select("+sessionVersion");
  const history = buildDemoHistory();

  await Promise.all([
    SalaryProfileModel.deleteMany({ userId: DEMO_EMAIL }),
    ExpenseModel.deleteMany({ userId: DEMO_EMAIL }),
    IncomeModel.deleteMany({ userId: DEMO_EMAIL }),
    BillModel.deleteMany({ userId: DEMO_EMAIL }),
    GoalModel.deleteMany({ userId: DEMO_EMAIL }),
    InvestmentModel.deleteMany({ userId: DEMO_EMAIL }),
    BankAccountModel.deleteMany({ userId: DEMO_EMAIL }),
    AccountTransferModel.deleteMany({ userId: DEMO_EMAIL }),
    CreditCardModel.deleteMany({ userId: DEMO_EMAIL }),
    BudgetRuleModel.deleteMany({ userId: DEMO_EMAIL }),
    RecycleBinModel.deleteMany({ userId: DEMO_EMAIL }),
    NotificationModel.deleteMany({ userId: DEMO_EMAIL }),
    SalaryHistoryModel.deleteMany({ userId: DEMO_EMAIL }),
    SharedExpenseInviteModel.deleteMany({
      $or: [{ ownerId: DEMO_EMAIL }, { friendEmail: DEMO_EMAIL }],
    }),
  ]);

  await Promise.all([
    SalaryProfileModel.create({
      userId: DEMO_EMAIL,
      amount: 85000,
      salaryDay: 25,
      cycle: "monthly",
      currency: "INR",
      country: "India",
      savingsGoal: 15000,
      emergencyFundGoal: 300000,
      investmentAmount: 10000,
    }),
    ExpenseModel.insertMany(history.expenses),
    IncomeModel.insertMany(history.incomes),
    SalaryHistoryModel.insertMany(history.salaryHistory),
    BillModel.insertMany([
      {
        userId: DEMO_EMAIL,
        name: "Rent",
        amount: 22000,
        dueDay: 1,
        frequency: "monthly",
        category: "Rent",
        paid: true,
      },
      {
        userId: DEMO_EMAIL,
        name: "Electricity",
        amount: 1800,
        dueDay: 12,
        frequency: "monthly",
        category: "Utilities",
        paid: false,
      },
      {
        userId: DEMO_EMAIL,
        name: "Internet",
        amount: 999,
        dueDay: 15,
        frequency: "monthly",
        category: "Utilities",
        paid: false,
      },
      {
        userId: DEMO_EMAIL,
        name: "Netflix",
        amount: 499,
        dueDay: 20,
        frequency: "monthly",
        category: "Subscriptions",
        paid: false,
      },
    ]),
    GoalModel.insertMany([
      {
        userId: DEMO_EMAIL,
        name: "Emergency Fund",
        type: "Emergency Fund",
        target: 300000,
        saved: 180000,
        monthlyContribution: 10000,
      },
      {
        userId: DEMO_EMAIL,
        name: "Goa Vacation",
        type: "Vacation",
        target: 60000,
        saved: 24000,
        monthlyContribution: 6000,
      },
    ]),
    InvestmentModel.insertMany([
      {
        userId: DEMO_EMAIL,
        name: "Nifty 50 Index",
        type: "SIP",
        invested: 120000,
        currentValue: 148000,
        monthly: 5000,
      },
      {
        userId: DEMO_EMAIL,
        name: "Parag Parikh Flexi",
        type: "Mutual Funds",
        invested: 90000,
        currentValue: 112500,
        monthly: 3000,
      },
    ]),
    BankAccountModel.insertMany([
      {
        userId: DEMO_EMAIL,
        bankName: "HDFC Salary",
        accountType: "Salary",
        balance: 42840,
        defaultFor: ["everyday", "obligations"],
      },
      {
        userId: DEMO_EMAIL,
        bankName: "SBI Savings",
        accountType: "Savings",
        balance: 180000,
        defaultFor: ["savings"],
      },
    ]),
    CreditCardModel.create({
      userId: DEMO_EMAIL,
      name: "Demo Rewards Card",
      bankName: "HDFC Bank",
      creditLimit: 120000,
      statementDay: 18,
      status: "active",
    }),
    BudgetRuleModel.create({
      userId: DEMO_EMAIL,
      name: "Demo 50/30/20 plan",
      templateKey: "50-30-20",
      active: true,
      allocations: [
        { kind: "needs", label: "Needs", percentage: 50 },
        { kind: "wants", label: "Wants", percentage: 30 },
        { kind: "savings", label: "Savings", percentage: 20 },
      ],
    }),
    NotificationModel.insertMany([
      {
        userId: DEMO_EMAIL,
        title: "Bill due soon",
        body: "Electricity bill of ₹1,800 is due on the 12th.",
        type: "bill",
      },
      {
        userId: DEMO_EMAIL,
        title: "Goal on track",
        body: "Your emergency fund is now 60% complete.",
        type: "goal",
      },
    ]),
  ]);

  const token = signJwt(
    { sub: String(user._id), email: user.email, sv: Number(user.sessionVersion ?? 0) },
    "12h",
  );
  const response = NextResponse.json({
    data: { id: user._id, email: user.email, name: user.name, onboardingCompleted: true },
  });
  setSessionCookie(response, token);
  return response;
}
