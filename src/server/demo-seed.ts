import {
  AccountTransferModel,
  BankAccountModel,
  BillModel,
  BudgetRuleModel,
  ChatMessageModel,
  CreditCardModel,
  ExpenseModel,
  FinancialProfileModel,
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

/* ---------------------------------------------------------------------------
   The public demo account.

   Every visitor who clicks "Explore live demo" lands in this one shared
   account, so the dataset here is the entire product surface: if a collection
   is empty, the corresponding page renders its empty state and the demo looks
   broken rather than seeded.

   Two rules make the dataset work:

   1. Ids are deterministic (`demo_acc_hdfc`, not a random uid). The client
      identifies every row by `clientId` — see normalizeServerItems in
      src/lib/store.ts — so cross-references like `expense.accountId` must point
      at a *clientId*, never a Mongo `_id`. Deterministic ids also make the
      references writable by hand and the re-seed reproducible.
   2. Nothing here is derived from a real account. All names, merchants and
      amounts are fabricated.
   --------------------------------------------------------------------------- */

export const DEMO_EMAIL = "demo@gmail.com";
export const DEMO_NAME = "Demo User";

/** Bank accounts. Referenced by expenses, bills, goals, transfers, investments. */
const ACCOUNTS = {
  salary: "demo_acc_hdfc",
  savings: "demo_acc_sbi",
  invest: "demo_acc_icici",
  closing: "demo_acc_kotak",
} as const;

/** Bills. Referenced by the expenses that pay them. */
const BILLS = {
  rent: "demo_bill_rent",
  power: "demo_bill_power",
  internet: "demo_bill_internet",
  netflix: "demo_bill_netflix",
  insurance: "demo_bill_insurance",
  gas: "demo_bill_gas",
} as const;

const GOALS = {
  emergency: "demo_goal_emergency",
  goa: "demo_goal_goa",
  laptop: "demo_goal_laptop",
} as const;

const SALARY_DAY = 25;
const BASE_SALARY = 85000;
const PREVIOUS_SALARY = 78000;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * A date on `day` of `month`, pulled back to today if that would land in the
 * future. Rows placed on a fixed day of the month — the shared splits, the
 * one-off incomes — would otherwise be post-dated whenever the demo is seeded
 * early in a month, and future-dated money distorts the current cycle.
 */
function dayInMonth(month: Date, day: number, now: Date): Date {
  const date = new Date(month.getFullYear(), month.getMonth(), day);
  return date > now ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : date;
}

/**
 * Every month from the start of the previous financial year through the current
 * one, inclusive. The current month matters: without it the dashboard's daily
 * number has no spending to pace against and the demo opens on an empty cycle.
 */
function demoMonths(now: Date): Date[] {
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const months: Date[] = [];
  const cursor = new Date(fyStartYear - 1, 3, 1);
  const last = startOfMonth(now);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

/* ---------------------------------------------------------------------------
   Row shapes.

   These are declared rather than inferred on purpose. Without them TypeScript
   narrows each array to the literal types of its first element — so a second
   account whose `clientId` differs from the first is an error, and optional
   fields present on only some rows vanish from the union. Naming the shapes
   also makes a misspelled key a compile error instead of a field Mongoose
   silently drops.
   --------------------------------------------------------------------------- */

interface SharedSplit {
  totalAmount: number;
  friendName: string;
  friendEmail?: string;
  userPaid: number;
  friendPaid: number;
  inviteRequested?: boolean;
}

interface ExpenseRow {
  userId: string;
  clientId: string;
  amount: number;
  category: string;
  note?: string;
  merchant?: string;
  paymentMethod: string;
  date: Date;
  recurring: boolean;
  favorite: boolean;
  tags: string[];
  accountId?: string;
  billId?: string;
  billingMonth?: string;
  balanceApplied: boolean;
  shared?: SharedSplit;
  fuel?: FuelFill;
}

interface FuelFill {
  litres: number;
  ratePerLitre: number;
  odometerKm?: number;
  rateSource?: string;
}

interface IncomeRow {
  userId: string;
  clientId: string;
  amount: number;
  type: string;
  source: string;
  date: Date;
  accountId?: string;
}

interface SalaryHistoryRow {
  userId: string;
  amount: number;
  date: Date;
  source: string;
  confirmed: boolean;
  note?: string;
  baseAmount: number;
  varianceAmount: number;
  varianceKind: "allowance" | "deduction" | "none";
}

interface AccountRow {
  userId: string;
  clientId: string;
  bankName: string;
  accountType: "Savings" | "Salary" | "Current" | "Other";
  balance: number;
  status: "active" | "closing" | "closed";
  plannedTransferTo?: string;
  defaultFor: string[];
  maskBalance: boolean;
  hiddenFromAccounts: boolean;
}

interface BillRow {
  userId: string;
  clientId: string;
  name: string;
  amount: number;
  dueDay: number;
  dueDate?: Date;
  frequency: "monthly" | "weekly" | "yearly" | "interval";
  intervalDays?: number;
  category: string;
  paid: boolean;
  provider?: string;
  purchaseDate?: Date;
  maturityDate?: Date;
  accountId?: string;
}

interface GoalContributionRow {
  id: string;
  amount: number;
  date: Date;
  accountId?: string;
  transferId?: string;
}

interface GoalRow {
  userId: string;
  clientId: string;
  name: string;
  type: string;
  target: number;
  saved: number;
  deadline?: Date;
  monthlyContribution: number;
  balanceAccountId?: string;
  preferredAccountId?: string;
  contributions: GoalContributionRow[];
}

interface InvestmentRow {
  userId: string;
  clientId: string;
  name: string;
  type: string;
  invested: number;
  currentValue: number;
  monthly?: number;
  accountId?: string;
}

interface TransferRow {
  userId: string;
  clientId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: Date;
  note?: string;
  status: "scheduled" | "completed";
  completedAt?: Date;
  balancesApplied: boolean;
  goalId?: string;
  goalAmount?: number;
}

interface CreditCardRow {
  userId: string;
  clientId: string;
  name: string;
  bankName: string;
  creditLimit: number;
  statementDay: number;
  status: "active" | "closed";
}

interface BudgetRuleRow {
  userId: string;
  clientId: string;
  name: string;
  templateKey: string;
  active: boolean;
  allocations: {
    kind: "needs" | "wants" | "savings" | "investments";
    label: string;
    percentage: number;
  }[];
}

interface RecycleRow {
  userId: string;
  clientId: string;
  entityType: string;
  entityId: string;
  label: string;
  deletedAt: Date;
  data: Record<string, unknown>;
}

interface NotificationRow {
  userId: string;
  title: string;
  body: string;
  type: "salary" | "bill" | "overspend" | "goal" | "shared" | "info";
  read: boolean;
  href?: string;
  dedupeKey: string;
}

interface SharedInviteRow {
  ownerId: string;
  friendName: string;
  friendEmail: string;
  title: string;
  expenseDate: Date;
  totalAmount: number;
  ownerPaid: number;
  friendPaid: number;
  status: "pending" | "accepted" | "declined";
}

type ExpenseSeed = {
  slug: string;
  day: number;
  amount: number;
  category: string;
  merchant: string;
  paymentMethod: string;
  note?: string;
  tags?: string[];
  recurring?: boolean;
  favorite?: boolean;
  accountId?: string;
  billId?: string;
  fuel?: FuelFill;
};

/** The pump rate for month `index`, drifting the way a real one does. */
function fuelRate(index: number): number {
  return 102 + (index % 4) * 1.5;
}

/** The spend on the fuel fill in month `index`. Kept next to `fuelFill`. */
function fuelAmount(index: number): number {
  return 1400 + (index % 3) * 210;
}

/**
 * One month's fill, with an odometer reading that makes the mileage real.
 *
 * `buildSegments` measures a segment as (this odometer − the previous one) over
 * *this* fill's litres, so the readings have to be a running total rather than
 * anything derived from `index` alone — hence the walk from zero. Targeting
 * 46–54 kmpl keeps every segment inside the Activa's plausible band
 * (`DEFAULT_VEHICLE`), so the lifetime average settles instead of being thrown
 * out as implausible.
 *
 * One month deliberately records no reading. That is the forgotten fill the
 * fuel module exists to catch: the next segment then spans two months of riding
 * against one month of petrol, lands near double the real figure, and is
 * flagged and dropped from the average on its own. It is also what gives the
 * report's "Without km" filter something to list — a demo where every fill is
 * perfectly logged never shows either behaviour.
 */
const FUEL_START_KM = 18_400;
const FUEL_UNRECORDED_MONTH = 5;

function fuelFill(index: number): FuelFill {
  let odometer = FUEL_START_KM;
  for (let month = 1; month <= index; month++) {
    const litres = fuelAmount(month) / fuelRate(month);
    // 46, 48, 50, 52, 54 — a spread, so the trend line is not a flat rule.
    odometer += Math.round(litres * (46 + (month % 5) * 2));
  }

  const ratePerLitre = fuelRate(index);
  return {
    litres: Number((fuelAmount(index) / ratePerLitre).toFixed(2)),
    ratePerLitre,
    odometerKm: index === FUEL_UNRECORDED_MONTH ? undefined : odometer,
  };
}

/** The repeating monthly shape. `index` varies amounts so charts are not flat. */
function monthlyExpenses(index: number, rent: number): ExpenseSeed[] {
  return [
    {
      slug: "rent",
      day: 1,
      amount: rent,
      category: "Rent",
      merchant: "Landlord",
      paymentMethod: "Bank Transfer",
      note: "Monthly rent",
      recurring: true,
      accountId: ACCOUNTS.salary,
      billId: BILLS.rent,
    },
    {
      slug: "groceries",
      day: 6,
      amount: 3100 + (index % 4) * 260,
      category: "Groceries",
      merchant: "BigBasket",
      paymentMethod: "UPI",
      tags: ["household"],
      accountId: ACCOUNTS.salary,
    },
    {
      slug: "power",
      day: 11,
      amount: 1550 + (index % 3) * 175,
      category: "Utilities",
      merchant: "MSEDCL",
      paymentMethod: "UPI",
      note: "Electricity bill",
      recurring: true,
      accountId: ACCOUNTS.salary,
      billId: BILLS.power,
    },
    {
      slug: "internet",
      day: 15,
      amount: 999,
      category: "Mobile & Internet",
      merchant: "Airtel Fiber",
      paymentMethod: "UPI",
      recurring: true,
      accountId: ACCOUNTS.salary,
      billId: BILLS.internet,
    },
    {
      slug: "netflix",
      day: 20,
      amount: 499,
      category: "Subscriptions",
      merchant: "Netflix",
      paymentMethod: "Card",
      recurring: true,
      accountId: ACCOUNTS.invest,
      billId: BILLS.netflix,
    },
    {
      slug: "food",
      day: 18,
      amount: 1250 + (index % 5) * 140,
      category: "Food",
      merchant: "Swiggy",
      paymentMethod: "UPI",
      note: "Weekend order",
      tags: ["eating-out"],
      accountId: ACCOUNTS.salary,
    },
    {
      slug: "travel",
      day: 21,
      amount: 780 + (index % 4) * 95,
      category: "Travel",
      merchant: "Uber",
      paymentMethod: "UPI",
      tags: ["commute"],
      accountId: ACCOUNTS.salary,
    },
    {
      slug: "shopping",
      day: 23,
      amount: 1700 + (index % 6) * 230,
      category: "Shopping",
      merchant: "Myntra",
      paymentMethod: "Card",
      favorite: index % 5 === 0,
      accountId: ACCOUNTS.salary,
    },
    {
      slug: "fuel",
      day: 9,
      amount: fuelAmount(index),
      category: "Fuel",
      merchant: "HP Petrol",
      paymentMethod: "Card",
      tags: ["commute"],
      accountId: ACCOUNTS.salary,
      fuel: { ...fuelFill(index), rateSource: "manual" },
    },
    {
      // The Investment category is what `bucketOf` in src/lib/reports.ts reads
      // to fill the reports page's Investments bucket. Without a contribution
      // recorded as spending, that bucket reads zero however large the holdings
      // on /investments are, and its drill-down opens empty.
      slug: "sip",
      day: 5,
      amount: 10000,
      category: "Investment",
      merchant: "Groww SIP",
      paymentMethod: "Bank Transfer",
      recurring: true,
      accountId: ACCOUNTS.invest,
    },
    {
      // Deliberately account-less. `bucketOf` sends an expense with no
      // accountId to the Unlinked bucket, which is the whole point of that
      // bucket — money the visitor has not attributed yet. Every other row here
      // names an account, so without this one the bucket can never be anything
      // but zero and the demo never shows what it is for.
      slug: "cash",
      day: 14,
      amount: 480 + (index % 4) * 90,
      category: "Food",
      merchant: "Street food",
      paymentMethod: "Cash",
    },
    {
      slug: "wellness",
      day: 27,
      amount: 850 + (index % 4) * 120,
      // Exercises the custom categories on the salary profile below.
      category: "Wellness",
      merchant: "Cult.fit",
      paymentMethod: "UPI",
      accountId: ACCOUNTS.salary,
    },
  ];
}

export function buildDemoDataset(now = new Date()) {
  const months = demoMonths(now);
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const currentFyStart = new Date(fyStartYear, 3, 1);
  const thisMonth = startOfMonth(now);

  const expenses: ExpenseRow[] = months.flatMap((month, index) => {
    const isCurrentMonth = month.getTime() === thisMonth.getTime();
    const rent = month >= currentFyStart ? 22000 : 20000;
    const key = monthKey(month);

    return monthlyExpenses(index, rent)
      // Never post-date the current month: an expense dated next week would
      // count against a cycle the visitor has not reached yet.
      .filter((seed) => !isCurrentMonth || seed.day <= now.getDate())
      .map((seed) => ({
        userId: DEMO_EMAIL,
        clientId: `demo_exp_${key}_${seed.slug}`,
        amount: seed.amount,
        category: seed.category,
        note: seed.note,
        merchant: seed.merchant,
        paymentMethod: seed.paymentMethod,
        date: new Date(month.getFullYear(), month.getMonth(), seed.day),
        recurring: Boolean(seed.recurring),
        favorite: Boolean(seed.favorite),
        tags: seed.tags ?? [],
        accountId: seed.accountId,
        billId: seed.billId,
        // Only bill-linked expenses carry a billing month; it is what marks the
        // bill paid for that cycle (see src/lib/bill-cycle.ts).
        billingMonth: seed.billId ? key : undefined,
        balanceApplied: Boolean(seed.accountId),
        fuel: seed.fuel,
      }));
  });

  // Shared splits, spread across the last three months so the Shared page and
  // the split badges in the expense list both have something to show.
  const sharedMonths = months.slice(-3);
  const sharedExpenses: ExpenseRow[] = sharedMonths.map((month, index) => {
    const total = [4200, 2600, 5400][index] ?? 3000;
    const friend = ["Riya Nair", "Arjun Mehta", "Kabir Shah"][index] ?? "Riya Nair";
    const userPaid = Math.round(total * 0.6);
    return {
      userId: DEMO_EMAIL,
      clientId: `demo_exp_${monthKey(month)}_shared`,
      amount: userPaid,
      category: ["Food", "Travel", "Entertainment"][index] ?? "Food",
      note: "Split with a friend",
      merchant: ["Toit Brewpub", "Ola Outstation", "PVR Cinemas"][index] ?? "Toit Brewpub",
      paymentMethod: "Card",
      date: dayInMonth(month, 17, now),
      recurring: false,
      favorite: false,
      tags: ["shared"],
      accountId: ACCOUNTS.salary,
      balanceApplied: true,
      shared: {
        totalAmount: total,
        friendName: friend,
        friendEmail: `${friend.split(" ")[0].toLowerCase()}.demo@example.com`,
        userPaid,
        friendPaid: total - userPaid,
        inviteRequested: index < 2,
      },
    };
  });

  const salaryHistory: SalaryHistoryRow[] = months.map((month, index) => {
    const inCurrentFy = month >= currentFyStart;
    const baseAmount = inCurrentFy ? BASE_SALARY : PREVIOUS_SALARY;
    const allowance = index % 5 === 4 ? 2500 : 0;
    const date = new Date(month.getFullYear(), month.getMonth(), SALARY_DAY);
    return {
      userId: DEMO_EMAIL,
      amount: baseAmount + allowance,
      date,
      source: "salary",
      // The current month's salary is only confirmed once payday has passed.
      confirmed: date <= now,
      note: allowance ? "Festive allowance" : undefined,
      baseAmount,
      varianceAmount: allowance,
      varianceKind: allowance ? "allowance" : "none",
    };
  });

  const incomes: IncomeRow[] = months.flatMap((month, index) =>
    index % 3 === 2
      ? [
          {
            userId: DEMO_EMAIL,
            clientId: `demo_inc_${monthKey(month)}_freelance`,
            amount: 4500 + index * 150,
            type: "Freelance",
            source: "Design project",
            date: dayInMonth(month, 16, now),
            accountId: ACCOUNTS.salary,
          },
        ]
      : [],
  );

  // A cashback and a reimbursement so the income-type filters are not
  // single-valued.
  const lastMonth = months[months.length - 1];
  incomes.push(
    {
      userId: DEMO_EMAIL,
      clientId: "demo_inc_cashback",
      amount: 620,
      type: "Cashback",
      source: "Credit card cashback",
      date: dayInMonth(lastMonth, 8, now),
      accountId: ACCOUNTS.invest,
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_inc_reimbursement",
      amount: 3400,
      type: "Reimbursement",
      source: "Travel reimbursement",
      date: dayInMonth(lastMonth, 12, now),
      accountId: ACCOUNTS.salary,
    },
  );

  const profile = {
    userId: DEMO_EMAIL,
    amount: BASE_SALARY,
    salaryDay: SALARY_DAY,
    cycle: "monthly",
    currency: "INR",
    country: "India",
    savingsGoal: 15000,
    emergencyFundGoal: 300000,
    investmentAmount: 10000,
    financialYearStart: fyStartYear,
    customCategories: [
      { id: "demo_cat_wellness", name: "Wellness", icon: "sparkles", color: "#14b8a6" },
      { id: "demo_cat_gifting", name: "Gifting", icon: "gift", color: "#f97316" },
    ],
  };

  const accounts: AccountRow[] = [
    {
      userId: DEMO_EMAIL,
      clientId: ACCOUNTS.salary,
      bankName: "HDFC Salary",
      accountType: "Salary",
      balance: 48250,
      status: "active",
      defaultFor: ["everyday", "obligations"],
      maskBalance: false,
      hiddenFromAccounts: false,
    },
    {
      userId: DEMO_EMAIL,
      clientId: ACCOUNTS.savings,
      bankName: "SBI Savings",
      accountType: "Savings",
      balance: 186000,
      status: "active",
      defaultFor: ["savings"],
      maskBalance: false,
      hiddenFromAccounts: false,
    },
    {
      userId: DEMO_EMAIL,
      clientId: ACCOUNTS.invest,
      bankName: "ICICI Investments",
      accountType: "Current",
      balance: 32400,
      status: "active",
      defaultFor: ["investments", "subscriptions"],
      maskBalance: false,
      hiddenFromAccounts: false,
    },
    {
      // A closing account exercises the plannedTransferTo / wind-down flow.
      userId: DEMO_EMAIL,
      clientId: ACCOUNTS.closing,
      bankName: "Kotak Legacy",
      accountType: "Savings",
      balance: 4200,
      status: "closing",
      plannedTransferTo: ACCOUNTS.savings,
      defaultFor: [],
      maskBalance: true,
      hiddenFromAccounts: false,
    },
  ];

  const bills: BillRow[] = [
    {
      userId: DEMO_EMAIL,
      clientId: BILLS.rent,
      name: "Rent",
      amount: 22000,
      dueDay: 1,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      frequency: "monthly",
      category: "Rent",
      paid: true,
      accountId: ACCOUNTS.salary,
    },
    {
      userId: DEMO_EMAIL,
      clientId: BILLS.power,
      name: "Electricity",
      amount: 1850,
      dueDay: 11,
      frequency: "monthly",
      category: "Utilities",
      paid: false,
      provider: "MSEDCL",
      accountId: ACCOUNTS.salary,
    },
    {
      userId: DEMO_EMAIL,
      clientId: BILLS.internet,
      name: "Internet",
      amount: 999,
      dueDay: 15,
      frequency: "monthly",
      category: "Mobile & Internet",
      paid: false,
      provider: "Airtel Fiber",
      accountId: ACCOUNTS.salary,
    },
    {
      userId: DEMO_EMAIL,
      clientId: BILLS.netflix,
      name: "Netflix",
      amount: 499,
      dueDay: 20,
      frequency: "monthly",
      category: "Subscriptions",
      paid: false,
      accountId: ACCOUNTS.invest,
    },
    {
      // Yearly bill with a maturity date, so the bills page shows more than
      // one frequency.
      userId: DEMO_EMAIL,
      clientId: BILLS.insurance,
      name: "Term Insurance",
      amount: 18500,
      dueDay: 8,
      dueDate: new Date(fyStartYear + 1, 1, 8),
      frequency: "yearly",
      category: "Insurance",
      paid: false,
      provider: "HDFC Life",
      purchaseDate: new Date(fyStartYear - 3, 1, 8),
      maturityDate: new Date(fyStartYear + 27, 1, 8),
      accountId: ACCOUNTS.savings,
    },
    {
      userId: DEMO_EMAIL,
      clientId: BILLS.gas,
      name: "Gas Cylinder",
      amount: 1150,
      dueDay: 5,
      frequency: "interval",
      intervalDays: 45,
      category: "Utilities",
      paid: false,
      provider: "Bharat Gas",
      accountId: ACCOUNTS.salary,
    },
  ];

  const goals: GoalRow[] = [
    {
      // Tracks the savings account balance directly rather than contributions.
      userId: DEMO_EMAIL,
      clientId: GOALS.emergency,
      name: "Emergency Fund",
      type: "Emergency Fund",
      target: 300000,
      saved: 0,
      monthlyContribution: 10000,
      balanceAccountId: ACCOUNTS.savings,
      contributions: [],
    },
    {
      userId: DEMO_EMAIL,
      clientId: GOALS.goa,
      name: "Goa Vacation",
      type: "Vacation",
      target: 60000,
      saved: 24000,
      deadline: new Date(now.getFullYear(), now.getMonth() + 5, 1),
      monthlyContribution: 6000,
      preferredAccountId: ACCOUNTS.savings,
      contributions: [
        {
          id: "demo_gc_goa_1",
          amount: 12000,
          date: new Date(now.getFullYear(), now.getMonth() - 3, 26),
          accountId: ACCOUNTS.savings,
        },
        {
          id: "demo_gc_goa_2",
          amount: 6000,
          date: new Date(now.getFullYear(), now.getMonth() - 2, 26),
          accountId: ACCOUNTS.savings,
        },
        {
          id: "demo_gc_goa_3",
          amount: 6000,
          date: new Date(now.getFullYear(), now.getMonth() - 1, 26),
          accountId: ACCOUNTS.savings,
          transferId: "demo_tr_goa",
        },
      ],
    },
    {
      userId: DEMO_EMAIL,
      clientId: GOALS.laptop,
      name: "New Laptop",
      type: "Laptop",
      target: 120000,
      saved: 32000,
      deadline: new Date(now.getFullYear() + 1, now.getMonth(), 1),
      monthlyContribution: 8000,
      preferredAccountId: ACCOUNTS.invest,
      contributions: [
        {
          id: "demo_gc_laptop_1",
          amount: 20000,
          date: new Date(now.getFullYear(), now.getMonth() - 2, 27),
          accountId: ACCOUNTS.invest,
        },
        {
          // Deliberately unlinked, so the "unassigned savings" prompt appears.
          id: "demo_gc_laptop_2",
          amount: 12000,
          date: new Date(now.getFullYear(), now.getMonth() - 1, 27),
        },
      ],
    },
  ];

  const investments: InvestmentRow[] = [
    {
      userId: DEMO_EMAIL,
      clientId: "demo_inv_nifty",
      name: "Nifty 50 Index",
      type: "SIP",
      invested: 120000,
      currentValue: 148000,
      monthly: 5000,
      accountId: ACCOUNTS.invest,
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_inv_flexi",
      name: "Parag Parikh Flexi",
      type: "Mutual Funds",
      invested: 90000,
      currentValue: 112500,
      monthly: 3000,
      accountId: ACCOUNTS.invest,
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_inv_ppf",
      name: "Public Provident Fund",
      type: "PPF",
      invested: 150000,
      currentValue: 168400,
      monthly: 2000,
      accountId: ACCOUNTS.savings,
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_inv_gold",
      name: "Sovereign Gold Bond",
      type: "Gold",
      invested: 60000,
      // A holding that is down, so the returns column is not uniformly green.
      currentValue: 57200,
      accountId: ACCOUNTS.savings,
    },
  ];

  const transfers: TransferRow[] = [
    {
      userId: DEMO_EMAIL,
      clientId: "demo_tr_sweep",
      sourceAccountId: ACCOUNTS.salary,
      destinationAccountId: ACCOUNTS.savings,
      amount: 15000,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 26),
      note: "Monthly savings sweep",
      status: "completed",
      completedAt: new Date(now.getFullYear(), now.getMonth() - 1, 26),
      balancesApplied: true,
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_tr_sip",
      sourceAccountId: ACCOUNTS.salary,
      destinationAccountId: ACCOUNTS.invest,
      amount: 10000,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 27),
      note: "SIP funding",
      status: "completed",
      completedAt: new Date(now.getFullYear(), now.getMonth() - 1, 27),
      balancesApplied: true,
    },
    {
      // Goal-linked: reserves part of the transfer against the Goa goal.
      userId: DEMO_EMAIL,
      clientId: "demo_tr_goa",
      sourceAccountId: ACCOUNTS.salary,
      destinationAccountId: ACCOUNTS.savings,
      amount: 6000,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 26),
      note: "Goa fund top-up",
      status: "completed",
      completedAt: new Date(now.getFullYear(), now.getMonth() - 1, 26),
      balancesApplied: true,
      goalId: GOALS.goa,
      goalAmount: 6000,
    },
    {
      // Still scheduled, and it is the wind-down of the closing Kotak account.
      userId: DEMO_EMAIL,
      clientId: "demo_tr_winddown",
      sourceAccountId: ACCOUNTS.closing,
      destinationAccountId: ACCOUNTS.savings,
      amount: 4200,
      date: new Date(now.getFullYear(), now.getMonth(), 28),
      note: "Close Kotak account",
      status: "scheduled",
      balancesApplied: false,
    },
  ];

  const creditCards: CreditCardRow[] = [
    {
      userId: DEMO_EMAIL,
      clientId: "demo_cc_millennia",
      name: "Millennia",
      bankName: "HDFC Bank",
      creditLimit: 120000,
      statementDay: 18,
      status: "active",
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_cc_amazon",
      name: "Amazon Pay",
      bankName: "ICICI Bank",
      creditLimit: 80000,
      statementDay: 5,
      status: "active",
    },
  ];

  // Template keys match src/lib/budget-rules.ts; exactly one rule is active.
  const budgetRules: BudgetRuleRow[] = [
    {
      userId: DEMO_EMAIL,
      clientId: "demo_rule_balanced",
      name: "Balanced 50/30/10/10",
      templateKey: "balanced-50-30-10-10",
      active: true,
      allocations: [
        { kind: "needs", label: "Needs", percentage: 50 },
        { kind: "wants", label: "Wants", percentage: 30 },
        { kind: "savings", label: "Cash savings", percentage: 10 },
        { kind: "investments", label: "Investments", percentage: 10 },
      ],
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_rule_emergency",
      name: "Emergency builder",
      templateKey: "emergency-builder-50-15-20-15",
      active: false,
      allocations: [
        { kind: "needs", label: "Needs", percentage: 50 },
        { kind: "wants", label: "Wants", percentage: 15 },
        { kind: "savings", label: "Emergency savings", percentage: 20 },
        { kind: "investments", label: "Investments", percentage: 15 },
      ],
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_rule_wealth",
      name: "Wealth builder",
      templateKey: "wealth-builder-50-20-15-15",
      active: false,
      allocations: [
        { kind: "needs", label: "Needs", percentage: 50 },
        { kind: "wants", label: "Wants", percentage: 20 },
        { kind: "savings", label: "Cash savings", percentage: 15 },
        { kind: "investments", label: "Investments", percentage: 15 },
      ],
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_rule_growth",
      name: "Growth focused",
      templateKey: "growth-focused-45-15-15-25",
      active: false,
      allocations: [
        { kind: "needs", label: "Needs", percentage: 45 },
        { kind: "wants", label: "Wants", percentage: 15 },
        { kind: "savings", label: "Cash savings", percentage: 15 },
        { kind: "investments", label: "Investments", percentage: 25 },
      ],
    },
  ];

  const recycleBin: RecycleRow[] = [
    {
      userId: DEMO_EMAIL,
      clientId: "demo_rb_gym",
      entityType: "expense",
      entityId: "demo_exp_deleted_gym",
      label: "Gym membership",
      deletedAt: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 4)),
      data: {
        id: "demo_exp_deleted_gym",
        amount: 2400,
        category: "Wellness",
        merchant: "Gold's Gym",
        paymentMethod: "Card",
        date: new Date(now.getFullYear(), now.getMonth() - 1, 3).toISOString(),
        recurring: false,
        // Not applied, so restoring it does not have to re-debit an account.
        balanceApplied: false,
      },
    },
    {
      userId: DEMO_EMAIL,
      clientId: "demo_rb_dth",
      entityType: "bill",
      entityId: "demo_bill_deleted_dth",
      label: "Tata Play DTH",
      deletedAt: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 9)),
      data: {
        id: "demo_bill_deleted_dth",
        name: "Tata Play DTH",
        amount: 430,
        dueDay: 22,
        frequency: "monthly",
        category: "Subscriptions",
        paid: false,
      },
    },
  ];

  const notifications: NotificationRow[] = [
    {
      userId: DEMO_EMAIL,
      title: "Bill due soon",
      body: "Your electricity bill of ₹1,850 is due on the 11th.",
      type: "bill",
      read: false,
      href: "/bills",
      dedupeKey: "demo-bill-power",
    },
    {
      userId: DEMO_EMAIL,
      title: "Goal on track",
      body: "Your emergency fund is now 62% complete.",
      type: "goal",
      read: false,
      href: "/goals",
      dedupeKey: "demo-goal-emergency",
    },
    {
      userId: DEMO_EMAIL,
      title: "Salary received",
      body: `₹${BASE_SALARY.toLocaleString("en-IN")} landed in your HDFC Salary account.`,
      type: "salary",
      read: true,
      href: "/salary-history",
      dedupeKey: "demo-salary-latest",
    },
    {
      userId: DEMO_EMAIL,
      title: "Split request sent",
      body: "Riya Nair still owes you ₹1,680 for Toit Brewpub.",
      type: "shared",
      read: false,
      href: "/shared",
      dedupeKey: "demo-shared-riya",
    },
  ];

  const sharedInvites: SharedInviteRow[] = [
    {
      ownerId: DEMO_EMAIL,
      friendName: "Riya Nair",
      friendEmail: "riya.demo@example.com",
      title: "Toit Brewpub",
      expenseDate: new Date(now.getFullYear(), now.getMonth() - 2, 17),
      totalAmount: 4200,
      ownerPaid: 2520,
      friendPaid: 1680,
      status: "pending",
    },
    {
      ownerId: DEMO_EMAIL,
      friendName: "Arjun Mehta",
      friendEmail: "arjun.demo@example.com",
      title: "Ola Outstation",
      expenseDate: new Date(now.getFullYear(), now.getMonth() - 1, 17),
      totalAmount: 2600,
      ownerPaid: 1560,
      friendPaid: 1040,
      status: "accepted",
    },
  ];

  return {
    profile,
    expenses: [...expenses, ...sharedExpenses],
    incomes,
    salaryHistory,
    bills,
    goals,
    investments,
    accounts,
    transfers,
    creditCards,
    budgetRules,
    recycleBin,
    notifications,
    sharedInvites,
  };
}

export type DemoDataset = ReturnType<typeof buildDemoDataset>;

/** Ensures the demo user row exists. Returns it with `sessionVersion` selected. */
export async function ensureDemoUser() {
  return UserModel.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        name: DEMO_NAME,
        emailVerified: true,
        onboardingCompleted: true,
        isAdmin: false,
      },
      $setOnInsert: { email: DEMO_EMAIL },
    },
    { upsert: true, new: true },
  ).select("+sessionVersion");
}

/**
 * Replaces the demo account's data wholesale.
 *
 * Deletes are scoped to `userId: DEMO_EMAIL` (and `ownerId`/`friendEmail` for
 * invites) — no other account is ever touched.
 */
export async function reseedDemoAccount(now = new Date()) {
  const data = buildDemoDataset(now);

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
    // Nothing here is re-inserted below: the assistant's two collections are
    // wiped rather than seeded. Every visitor shares this one account, so a
    // conversation left behind is replayed to the next one by GET /api/chat,
    // along with whatever personal detail the previous visitor typed into it —
    // which the assistant also persists to FinancialProfile. A demo that is
    // rebuilt every window must clear them, or they accumulate forever.
    ChatMessageModel.deleteMany({ userId: DEMO_EMAIL }),
    FinancialProfileModel.deleteMany({ userId: DEMO_EMAIL }),
  ]);

  await Promise.all([
    SalaryProfileModel.create(data.profile),
    ExpenseModel.insertMany(data.expenses),
    IncomeModel.insertMany(data.incomes),
    SalaryHistoryModel.insertMany(data.salaryHistory),
    BillModel.insertMany(data.bills),
    GoalModel.insertMany(data.goals),
    InvestmentModel.insertMany(data.investments),
    BankAccountModel.insertMany(data.accounts),
    AccountTransferModel.insertMany(data.transfers),
    CreditCardModel.insertMany(data.creditCards),
    BudgetRuleModel.insertMany(data.budgetRules),
    RecycleBinModel.insertMany(data.recycleBin),
    NotificationModel.insertMany(data.notifications),
    SharedExpenseInviteModel.insertMany(data.sharedInvites),
  ]);

  return data;
}
