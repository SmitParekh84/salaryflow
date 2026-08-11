import type { CreditCard, Expense, Income } from "./types";
import { parseFinancialDate } from "./utils";

function dayInMonth(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), 12);
}

export function creditCardStatementPeriod(card: CreditCard, now = new Date()) {
  const currentStatement = dayInMonth(now.getFullYear(), now.getMonth(), card.statementDay);
  const statementEnd =
    now <= currentStatement
      ? currentStatement
      : dayInMonth(now.getFullYear(), now.getMonth() + 1, card.statementDay);
  const previousStatement = dayInMonth(
    statementEnd.getFullYear(),
    statementEnd.getMonth() - 1,
    card.statementDay,
  );
  const start = new Date(previousStatement);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(statementEnd);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function creditCardUsage(
  card: CreditCard,
  expenses: Expense[],
  incomes: Income[],
  now = new Date(),
) {
  const { start, end } = creditCardStatementPeriod(card, now);
  const isRecorded = (date: string) => parseFinancialDate(date) <= now;
  const charges = expenses
    .filter((expense) => expense.accountId === card.id && isRecorded(expense.date))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const credits = incomes
    .filter((income) => income.accountId === card.id && isRecorded(income.date))
    .reduce((sum, income) => sum + income.amount, 0);
  const outstanding = Math.max(0, charges - credits);
  return {
    start,
    end,
    charges,
    credits,
    outstanding,
    available: Math.max(0, card.creditLimit - outstanding),
    utilization: card.creditLimit > 0 ? (outstanding / card.creditLimit) * 100 : 0,
  };
}
