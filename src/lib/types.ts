export type SalaryCycle = "monthly" | "weekly" | "biweekly" | "custom";

export type ExpenseCategory =
  | "Food"
  | "Groceries"
  | "Fuel"
  | "Travel"
  | "Shopping"
  | "Entertainment"
  | "EMI"
  | "Rent"
  | "Utilities"
  | "Mobile & Internet"
  | "Insurance"
  | "Medical"
  | "Education"
  | "Investment"
  | "Subscriptions"
  | "Pets"
  | "Family"
  | "Personal Care"
  | "Business"
  | "Other";

export type PaymentMethod = "Cash" | "Card" | "UPI" | "Bank Transfer" | "Wallet";

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  merchant?: string;
  paymentMethod: PaymentMethod;
  date: string; // ISO
  recurring?: boolean;
  favorite?: boolean;
  tags?: string[];
  accountId?: string;
  billId?: string;
  billingMonth?: string;
  shared?: SharedExpenseDetails;
}

export interface SharedExpenseDetails {
  totalAmount: number;
  friendName: string;
  friendEmail?: string;
  userPaid: number;
  friendPaid: number;
  inviteRequested?: boolean;
}

export type IncomeType =
  | "Salary"
  | "Bonus"
  | "Side Income"
  | "Freelance"
  | "Other"
  | "Reimbursement"
  | "Cashback";

export interface Income {
  id: string;
  amount: number;
  type: IncomeType;
  source: string;
  date: string;
  accountId?: string;
}

export type BillFrequency = "monthly" | "weekly" | "yearly" | "interval";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // legacy fallback for records created before dueDate
  dueDate?: string; // selected occurrence; monthly bills reuse its day
  frequency: BillFrequency;
  intervalDays?: number;
  category: ExpenseCategory;
  paid: boolean;
  maturityDate?: string; // optional ISO date when the bill/contract matures
  accountId?: string;
}

export type GoalType =
  | "Emergency Fund"
  | "Vacation"
  | "Car"
  | "Bike"
  | "Laptop"
  | "Phone"
  | "Gaming Setup"
  | "House"
  | "Wedding"
  | "Education"
  | "Retirement"
  | "Custom";

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  target: number;
  saved: number;
  deadline?: string;
  monthlyContribution: number;
  contributions?: GoalContribution[];
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
}

export type InvestmentType =
  | "SIP"
  | "Mutual Funds"
  | "Stocks"
  | "Crypto"
  | "Gold"
  | "FD"
  | "RD"
  | "PPF"
  | "EPF"
  | "NPS"
  | "Custom";

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  invested: number;
  currentValue: number;
  monthly?: number;
  accountId?: string;
}

export interface SalaryProfile {
  amount: number;
  salaryDay: number; // day of month salary lands
  cycle: SalaryCycle;
  currency: string;
  country: string;
  savingsGoal: number;
  emergencyFundGoal: number;
  investmentAmount: number;
}

export interface UserProfile {
  name: string;
  email: string;
  onboarded: boolean;
  isAdmin?: boolean;
}

export type BankAccountType = "Savings" | "Salary" | "Current" | "Other";
export type BankAccountStatus = "active" | "closing";
export type AccountPurpose =
  | "everyday"
  | "subscriptions"
  | "investments"
  | "obligations"
  | "savings";

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: BankAccountType;
  balance: number;
  status: BankAccountStatus;
  plannedTransferTo?: string;
  defaultFor?: AccountPurpose[];
  maskBalance?: boolean;
  hiddenFromAccounts?: boolean;
}

export type AccountTransferStatus = "scheduled" | "completed";
export type AccountTransferMode = "scheduled" | "transfer-now" | "already-transferred";

export interface AccountTransfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  note?: string;
  status: AccountTransferStatus;
  completedAt?: string;
  balancesApplied?: boolean;
}

export type CreditCardStatus = "active" | "closed";

export interface CreditCard {
  id: string;
  name: string;
  bankName: string;
  creditLimit: number;
  statementDay: number;
  status: CreditCardStatus;
}

export type BudgetBucketKind = "needs" | "wants" | "savings" | "investments";

export interface BudgetAllocation {
  kind: BudgetBucketKind;
  label: string;
  percentage: number;
}

export interface BudgetRule {
  id: string;
  name: string;
  templateKey?: string;
  active: boolean;
  allocations: BudgetAllocation[];
}

export type RecycleEntityType =
  | "expense"
  | "income"
  | "bill"
  | "goal"
  | "investment"
  | "account"
  | "credit-card"
  | "budget-rule"
  | "salary-history";

export interface RecycleBinItem {
  id: string;
  entityType: RecycleEntityType;
  entityId: string;
  label: string;
  deletedAt: string;
  data: Record<string, unknown>;
}

export interface SalaryHistoryEntry {
  _id?: string;
  amount: number;
  date: string;
  source?: string;
  confirmed?: boolean;
  note?: string;
  baseAmount?: number;
  varianceAmount?: number;
  varianceKind?: "allowance" | "deduction" | "none";
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "salary" | "bill" | "overspend" | "goal" | "shared" | "info";
  date: string;
  read: boolean;
  href?: string;
}

export type SpendStatus = "green" | "yellow" | "red";
