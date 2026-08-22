import type { BankAccount, CreditCard, Expense, Income } from "./types";
import { parseFinancialDate } from "./utils";

/**
 * A reconciled statement, produced outside the app.
 *
 * Bank PDFs disagree about almost everything — column order, whether direction
 * is a column or has to be inferred from the running balance, whether a payee
 * has a name or only a UPI handle. Keeping that mess out of the app and
 * accepting one plain shape here means a new bank costs a parser, not a change
 * to anything the app reasons about.
 */
export interface ImportDoc {
  version: number;
  generatedAt: string;
  accounts: {
    key: string;
    bankName: string;
    accountType: BankAccount["accountType"];
    balance: number;
  }[];
  creditCards: {
    key: string;
    name: string;
    bankName: string;
    creditLimit: number;
    statementDay: number;
  }[];
  expenses: {
    date: string;
    amount: number;
    account: string;
    merchant: string;
    category: string;
    paymentMethod: string;
    source: string;
    shared?: { friendName: string; groupTotal: number };
    fuel?: { odometerKm?: number; ratePerLitre: number };
  }[];
  incomes: {
    date: string;
    amount: number;
    account: string;
    source: string;
    type: string;
    origin: string;
  }[];
}

export interface ImportPlan {
  accountsToCreate: { key: string; account: Omit<BankAccount, "id"> }[];
  accountsToUpdate: { id: string; bankName: string; balance: number }[];
  cardsToCreate: { key: string; card: Omit<CreditCard, "id"> }[];
  /** Keyed by import key so ids can be filled in once the account exists. */
  expenses: { accountKey: string; expense: Omit<Expense, "id" | "accountId"> }[];
  incomes: { accountKey: string; income: Omit<Income, "id" | "accountId"> }[];
  duplicateExpenses: number;
  duplicateIncomes: number;
  totals: { spend: number; income: number };
}

export class ImportFormatError extends Error {}

export function parseImportDoc(raw: unknown): ImportDoc {
  if (!raw || typeof raw !== "object") throw new ImportFormatError("That file is not an import file.");
  const doc = raw as Partial<ImportDoc>;
  if (doc.version !== 1) {
    throw new ImportFormatError(`Unsupported import version ${String(doc.version)}. Expected 1.`);
  }
  for (const field of ["accounts", "creditCards", "expenses", "incomes"] as const) {
    if (!Array.isArray(doc[field])) throw new ImportFormatError(`Missing "${field}" in the file.`);
  }
  return doc as ImportDoc;
}

/**
 * How far apart two amounts can be and still be the same payment.
 *
 * A figure typed by hand gets rounded — ₹855 for a ₹855.64 booking, ₹351 for a
 * ₹350.70 burger. Requiring an exact match lets every one of those back in as a
 * second copy of a payment the user already recorded.
 */
const AMOUNT_TOLERANCE = 1;

function dayOf(date: string): string {
  return parseFinancialDate(date).toDateString();
}

/**
 * Matches an incoming row against records already held.
 *
 * Keyed on the day and the amount, deliberately ignoring the payee. The same
 * payment is spelled one way by hand and another by the bank — "BookMyShow"
 * against "Bookmyshow", "Narnarayan Fuel" against "Narnarayan Fuel Point" — and
 * a name-aware rule treats all of those as new. Against real data that was 67
 * duplicate rows worth ₹27,000.
 *
 * A matched record is consumed, so two genuinely separate ₹55 payments on one
 * day still import as two.
 *
 * Only records ALREADY HELD enter the pool — rows never match other rows from
 * the same file. A bank statement does not print the same transaction twice,
 * so two same-day equal-amount rows in one file are two real payments (two
 * chai stops, a fee and its twin GST line). Pooling file rows collapsed 30
 * genuine transactions on the first real import.
 */
function seenMatcher(rows: { date: string; amount: number }[]) {
  const byDay = new Map<string, { amount: number; taken: boolean }[]>();
  for (const row of rows) {
    const key = dayOf(row.date);
    const bucket = byDay.get(key);
    if (bucket) bucket.push({ amount: row.amount, taken: false });
    else byDay.set(key, [{ amount: row.amount, taken: false }]);
  }

  return {
    /** True when this row is already held. Consumes the record it matched. */
    claim(date: string, amount: number): boolean {
      const bucket = byDay.get(dayOf(date));
      const hit = bucket?.find(
        (entry) => !entry.taken && Math.abs(entry.amount - amount) <= AMOUNT_TOLERANCE,
      );
      if (!hit) return false;
      hit.taken = true;
      return true;
    },
  };
}

export function buildImportPlan(
  doc: ImportDoc,
  existing: { accounts: BankAccount[]; creditCards: CreditCard[]; expenses: Expense[]; incomes: Income[] },
): ImportPlan {
  const byBankName = new Map(existing.accounts.map((a) => [a.bankName.trim().toLowerCase(), a]));
  const byCardName = new Map(existing.creditCards.map((c) => [c.name.trim().toLowerCase(), c]));

  const accountsToCreate: ImportPlan["accountsToCreate"] = [];
  const accountsToUpdate: ImportPlan["accountsToUpdate"] = [];
  for (const entry of doc.accounts) {
    const match = byBankName.get(entry.bankName.trim().toLowerCase());
    if (match) {
      accountsToUpdate.push({ id: match.id, bankName: match.bankName, balance: entry.balance });
    } else {
      accountsToCreate.push({
        key: entry.key,
        account: {
          bankName: entry.bankName,
          accountType: entry.accountType,
          balance: entry.balance,
          status: "active",
        },
      });
    }
  }

  const cardsToCreate: ImportPlan["cardsToCreate"] = [];
  for (const entry of doc.creditCards) {
    if (byCardName.has(entry.name.trim().toLowerCase())) continue;
    cardsToCreate.push({
      key: entry.key,
      card: {
        name: entry.name,
        bankName: entry.bankName,
        creditLimit: entry.creditLimit,
        statementDay: entry.statementDay,
        status: "active",
      },
    });
  }

  const seenExpenses = seenMatcher(existing.expenses);
  const expenses: ImportPlan["expenses"] = [];
  let duplicateExpenses = 0;
  for (const row of doc.expenses) {
    if (seenExpenses.claim(row.date, row.amount)) {
      duplicateExpenses += 1;
      continue;
    }
    expenses.push({
      accountKey: row.account,
      expense: {
        amount: row.amount,
        category: row.category as Expense["category"],
        merchant: row.merchant,
        paymentMethod: row.paymentMethod as Expense["paymentMethod"],
        date: parseFinancialDate(row.date).toISOString(),
        note: row.source,
        // Historical import: the balances in the file are already the closing
        // figures, so replaying each deduction would take every account far
        // below where it really sits.
        balanceApplied: false,
        ...(row.fuel
          ? {
              fuel: {
                odometerKm: row.fuel.odometerKm,
                litres: row.amount / row.fuel.ratePerLitre,
                ratePerLitre: row.fuel.ratePerLitre,
                rateSource: "manual" as const,
              },
            }
          : {}),
        ...(row.shared
          ? {
              shared: {
                totalAmount: row.shared.groupTotal,
                friendName: row.shared.friendName,
                userPaid: row.amount,
                friendPaid: 0,
              },
            }
          : {}),
      },
    });
  }

  const seenIncomes = seenMatcher(existing.incomes);
  const incomes: ImportPlan["incomes"] = [];
  let duplicateIncomes = 0;
  for (const row of doc.incomes) {
    if (seenIncomes.claim(row.date, row.amount)) {
      duplicateIncomes += 1;
      continue;
    }
    incomes.push({
      accountKey: row.account,
      income: {
        amount: row.amount,
        type: row.type as Income["type"],
        source: row.source,
        date: parseFinancialDate(row.date).toISOString(),
      },
    });
  }

  return {
    accountsToCreate,
    accountsToUpdate,
    cardsToCreate,
    expenses,
    incomes,
    duplicateExpenses,
    duplicateIncomes,
    totals: {
      spend: expenses.reduce((sum, e) => sum + e.expense.amount, 0),
      income: incomes.reduce((sum, i) => sum + i.income.amount, 0),
    },
  };
}

export interface ImportResult {
  accountsCreated: number;
  accountsUpdated: number;
  cardsCreated: number;
  expensesAdded: number;
  incomesAdded: number;
}
