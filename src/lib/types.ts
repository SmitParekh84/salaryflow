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

export type PaymentMethod =
  | "Cash"
  | "Card"
  | "UPI"
  | "Bank Transfer"
  | "Wallet";

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
}

export type IncomeType =
  | "Salary"
  | "Bonus"
  | "Side Income"
  | "Freelance"
  | "Other";

export interface Income {
  id: string;
  amount: number;
  type: IncomeType;
  source: string;
  date: string;
}

export type BillFrequency = "monthly" | "weekly" | "yearly";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // day of month
  frequency: BillFrequency;
  category: ExpenseCategory;
  paid: boolean;
  maturityDate?: string; // optional ISO date when the bill/contract matures
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

export interface SalaryHistoryEntry {
  _id?: string;
  amount: number;
  date: string;
  source?: string;
  confirmed?: boolean;
  note?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "salary" | "bill" | "overspend" | "goal" | "info";
  date: string;
  read: boolean;
}

export type SpendStatus = "green" | "yellow" | "red";
