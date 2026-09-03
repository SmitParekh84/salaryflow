import type { CreditCard, Expense, Income } from "./types";
import { parseFinancialDate } from "./utils";

function dayInMonth(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), 12);
}

export function creditCardStatementPeriod(card: CreditCard, now = new Date()) {
  const currentStatement = dayInMonth(now.getFullYear(), now.getMonth(), card.statementDay);
  /*
   * Compared as calendar days, not as moments. `dayInMonth` builds the
   * statement day at noon, so testing `now` against it flipped the period to
   * next month's halfway through the very day the statement closed: a charge
   * made on the 20th read as still accruing at 09:00 and as already billed at
   * 14:00. Midnight-today against noon-of-that-day answers the question that
   * was meant — is the closing day still ahead of us, or here?
   */
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const statementEnd =
    today <= currentStatement
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
  const previousStatementEnd = new Date(previousStatement);
  previousStatementEnd.setHours(23, 59, 59, 999);
  // `previousStatementEnd` is when the last bill closed. Callers need it to say
  // when an unpaid balance actually fell due — `end` is the *next* close, and
  // dating an overdue amount to that is how money owed today came to be
  // presented as next month's problem.
  return { start, end, previousStatementEnd };
}

export function creditCardUsage(
  card: CreditCard,
  expenses: Expense[],
  incomes: Income[],
  now = new Date(),
) {
  const { start, end, previousStatementEnd } = creditCardStatementPeriod(card, now);
  /*
   * Recorded means "dated today or earlier", not "timestamped before this
   * instant". Stored dates are day values anchored at local noon, so comparing
   * them against `now` hid every charge and payment entered this morning until
   * midday — understating the outstanding balance, and with it the transfer the
   * funding plan asks you to make to clear the card.
   */
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const isRecorded = (date: string) => parseFinancialDate(date) <= endOfToday;

  const cardCharges = expenses.filter(
    (expense) => expense.accountId === card.id && isRecorded(expense.date),
  );
  const charges = cardCharges.reduce((sum, expense) => sum + expense.amount, 0);
  // Anything before this period opened belongs to a statement that has already
  // been issued, so it is owed now rather than at the next close.
  const billedCharges = cardCharges
    .filter((expense) => parseFinancialDate(expense.date) < start)
    .reduce((sum, expense) => sum + expense.amount, 0);
  const currentCharges = charges - billedCharges;

  const credits = incomes
    .filter((income) => income.accountId === card.id && isRecorded(income.date))
    .reduce((sum, income) => sum + income.amount, 0);

  // Payments clear the oldest debt first, the way an issuer applies them, and
  // anything left over spills onto the statement still accruing.
  const billedOutstanding = Math.max(0, billedCharges - credits);
  const unusedCredits = Math.max(0, credits - billedCharges);
  const currentOutstanding = Math.max(0, currentCharges - unusedCredits);
  // Identical to the old `max(0, charges - credits)` in every case, so the
  // running total the rest of the app reads is unchanged.
  const outstanding = billedOutstanding + currentOutstanding;

  return {
    start,
    end,
    previousStatementEnd,
    charges,
    credits,
    /** Owed on a statement that has already closed. Due now. */
    billedOutstanding,
    /** Accruing on the statement that closes on `end`. */
    currentOutstanding,
    outstanding,
    available: Math.max(0, card.creditLimit - outstanding),
    utilization: card.creditLimit > 0 ? (outstanding / card.creditLimit) * 100 : 0,
  };
}
