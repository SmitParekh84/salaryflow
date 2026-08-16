import { CATEGORY_COLORS } from "./theme";
import type { DefaultExpenseCategory, GoalType, InvestmentType, PaymentMethod } from "./types";

/** Swatches resolve from globals.css tokens — see src/lib/theme.ts. */
export const CATEGORY_META: Record<DefaultExpenseCategory, { color: string }> = {
  Food: { color: CATEGORY_COLORS.food },
  Groceries: { color: CATEGORY_COLORS.groceries },
  Fuel: { color: CATEGORY_COLORS.fuel },
  Travel: { color: CATEGORY_COLORS.travel },
  Shopping: { color: CATEGORY_COLORS.shopping },
  Entertainment: { color: CATEGORY_COLORS.entertainment },
  EMI: { color: CATEGORY_COLORS.emi },
  Rent: { color: CATEGORY_COLORS.rent },
  Utilities: { color: CATEGORY_COLORS.utilities },
  "Mobile & Internet": { color: CATEGORY_COLORS.mobile },
  Insurance: { color: CATEGORY_COLORS.insurance },
  Medical: { color: CATEGORY_COLORS.medical },
  Education: { color: CATEGORY_COLORS.education },
  Investment: { color: CATEGORY_COLORS.investment },
  Subscriptions: { color: CATEGORY_COLORS.subscriptions },
  Pets: { color: CATEGORY_COLORS.pets },
  Family: { color: CATEGORY_COLORS.family },
  "Personal Care": { color: CATEGORY_COLORS.personalCare },
  Business: { color: CATEGORY_COLORS.business },
  Other: { color: CATEGORY_COLORS.other },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as DefaultExpenseCategory[];

export const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "Card", "Cash", "Bank Transfer", "Wallet"];

export const GOAL_TYPES: GoalType[] = [
  "Emergency Fund",
  "Vacation",
  "Car",
  "Bike",
  "Laptop",
  "Phone",
  "Gaming Setup",
  "House",
  "Wedding",
  "Education",
  "Retirement",
  "Custom",
];

export const INVESTMENT_TYPES: InvestmentType[] = [
  "SIP",
  "Mutual Funds",
  "Stocks",
  "Crypto",
  "Gold",
  "FD",
  "RD",
  "PPF",
  "EPF",
  "NPS",
  "Custom",
];

export const CURRENCIES = [
  { code: "INR", name: "Indian Rupee" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "AED", name: "UAE Dirham" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "JPY", name: "Japanese Yen" },
];

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Australia",
  "Canada",
  "Singapore",
  "Germany",
  "Japan",
];

export const COUNTRY_CURRENCIES: Record<string, string> = {
  India: "INR",
  "United States": "USD",
  "United Kingdom": "GBP",
  "United Arab Emirates": "AED",
  Australia: "AUD",
  Canada: "CAD",
  Singapore: "SGD",
  Germany: "EUR",
  Japan: "JPY",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/funding-plan", label: "Salary plan", icon: "BadgeIndianRupee" },
  { href: "/accounts", label: "Accounts", icon: "Landmark" },
  { href: "/expenses", label: "Expenses", icon: "Receipt" },
  { href: "/shared", label: "Shared spending", mobileLabel: "Shared", icon: "Users" },
  { href: "/bills", label: "Bills", icon: "CalendarClock" },
  { href: "/goals", label: "Goals", icon: "Target" },
  { href: "/investments", label: "Investments", icon: "TrendingUp" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/assistant", label: "Assistant", icon: "Sparkles" },
  { href: "/settings", label: "Settings", icon: "Settings" },
  { href: "/rules", label: "Budget rules", icon: "ListChecks", settingsOnly: true },
  { href: "/recycle-bin", label: "Recycle bin", icon: "Trash2", settingsOnly: true },
] as const;
