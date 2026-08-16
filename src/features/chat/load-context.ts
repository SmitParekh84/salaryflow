import type { BankAccount, Bill, Expense, Goal, Investment, SalaryProfile } from "@/lib/types";
import { connectDB } from "@/server/db";
import {
  BankAccountModel,
  BillModel,
  ExpenseModel,
  FinancialProfileModel,
  GoalModel,
  InvestmentModel,
  SalaryProfileModel,
} from "@/server/models";
import {
  buildFinancialContext,
  financialProfileFromDoc,
  type FinancialContext,
} from "./context";

/** Enough history for a 3-month average without dragging the whole ledger in. */
const EXPENSE_LIMIT = 600;

const DEFAULT_SALARY: SalaryProfile = {
  amount: 0,
  salaryDay: 1,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 0,
  emergencyFundGoal: 0,
  investmentAmount: 0,
};

/**
 * Read one user's finances and reduce them to the assistant's snapshot.
 *
 * The user is identified by the session on the server. Nothing in the request
 * body selects whose data is read, so a tampered request cannot reach another
 * user's finances.
 */
export async function loadFinancialContext(userId: string): Promise<FinancialContext> {
  await connectDB();

  const since = new Date(Date.now() - 100 * 86_400_000);

  const [salary, expenses, bills, investments, goals, accounts, profile] = await Promise.all([
    SalaryProfileModel.findOne({ userId }).lean(),
    ExpenseModel.find({ userId, removedAt: null, date: { $gte: since } })
      .sort({ date: -1 })
      .limit(EXPENSE_LIMIT)
      .lean(),
    BillModel.find({ userId, removedAt: null }).lean(),
    InvestmentModel.find({ userId, removedAt: null }).lean(),
    GoalModel.find({ userId, removedAt: null }).lean(),
    BankAccountModel.find({ userId, removedAt: null }).lean(),
    FinancialProfileModel.findOne({ userId }).lean(),
  ]);

  return buildFinancialContext({
    salary: (salary as SalaryProfile | null) ?? DEFAULT_SALARY,
    expenses: (expenses as unknown as Expense[]).map((item) => ({
      ...item,
      date: new Date(item.date).toISOString(),
    })),
    bills: bills as unknown as Bill[],
    investments: investments as unknown as Investment[],
    goals: goals as unknown as Goal[],
    accounts: accounts as unknown as BankAccount[],
    profile: financialProfileFromDoc(profile as Record<string, unknown> | null, new Date()),
  });
}
