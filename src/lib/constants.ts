import type { ExpenseCategory, GoalType, InvestmentType, PaymentMethod } from "./types";

export const CATEGORY_META: Record<ExpenseCategory, { color: string; emoji: string }> = {
  Food: { color: "#f97316", emoji: "🍔" },
  Groceries: { color: "#22c55e", emoji: "🛒" },
  Fuel: { color: "#ef4444", emoji: "⛽" },
  Travel: { color: "#0ea5e9", emoji: "✈️" },
  Shopping: { color: "#ec4899", emoji: "🛍️" },
  Entertainment: { color: "#a855f7", emoji: "🎬" },
  EMI: { color: "#6366f1", emoji: "🏦" },
  Rent: { color: "#f59e0b", emoji: "🏠" },
  Utilities: { color: "#14b8a6", emoji: "💡" },
  Insurance: { color: "#3b82f6", emoji: "🛡️" },
  Medical: { color: "#e11d48", emoji: "💊" },
  Education: { color: "#8b5cf6", emoji: "🎓" },
  Investment: { color: "#10b981", emoji: "📈" },
  Subscriptions: { color: "#f43f5e", emoji: "📺" },
  Pets: { color: "#84cc16", emoji: "🐾" },
  Family: { color: "#06b6d4", emoji: "👨‍👩‍👧" },
  "Personal Care": { color: "#d946ef", emoji: "💅" },
  Business: { color: "#64748b", emoji: "💼" },
  Other: { color: "#94a3b8", emoji: "📦" },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as ExpenseCategory[];

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

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/accounts", label: "Accounts", icon: "Landmark" },
  { href: "/expenses", label: "Expenses", icon: "Receipt" },
  { href: "/bills", label: "Bills", icon: "CalendarClock" },
  { href: "/goals", label: "Goals", icon: "Target" },
  { href: "/investments", label: "Investments", icon: "TrendingUp" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/rules", label: "Budget rules", icon: "ListChecks" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;
