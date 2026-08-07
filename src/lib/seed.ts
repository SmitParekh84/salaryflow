import type {
  Bill,
  Expense,
  Goal,
  Income,
  Investment,
  SalaryProfile,
} from "./types";
import { uid } from "./utils";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const seedProfile: SalaryProfile = {
  amount: 85000,
  salaryDay: 1,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 15000,
  emergencyFundGoal: 300000,
  investmentAmount: 10000,
};

export function seedExpenses(): Expense[] {
  return [
    { id: uid("exp"), amount: 22000, category: "Rent", paymentMethod: "Bank Transfer", date: daysAgo(new Date().getDate() - 1), merchant: "Landlord", recurring: true },
    { id: uid("exp"), amount: 3800, category: "Groceries", paymentMethod: "UPI", date: daysAgo(2), merchant: "BigBasket" },
    { id: uid("exp"), amount: 640, category: "Food", paymentMethod: "UPI", date: daysAgo(0), merchant: "Swiggy", note: "Lunch" },
    { id: uid("exp"), amount: 1200, category: "Fuel", paymentMethod: "Card", date: daysAgo(3), merchant: "HP Petrol" },
    { id: uid("exp"), amount: 499, category: "Subscriptions", paymentMethod: "Card", date: daysAgo(4), merchant: "Netflix", recurring: true },
    { id: uid("exp"), amount: 2600, category: "Shopping", paymentMethod: "Card", date: daysAgo(5), merchant: "Myntra" },
    { id: uid("exp"), amount: 350, category: "Travel", paymentMethod: "UPI", date: daysAgo(1), merchant: "Uber" },
    { id: uid("exp"), amount: 1800, category: "Utilities", paymentMethod: "UPI", date: daysAgo(6), merchant: "Electricity", recurring: true },
    { id: uid("exp"), amount: 900, category: "Entertainment", paymentMethod: "Card", date: daysAgo(7), merchant: "PVR" },
    { id: uid("exp"), amount: 5500, category: "EMI", paymentMethod: "Bank Transfer", date: daysAgo(8), merchant: "HDFC Bank", recurring: true },
    { id: uid("exp"), amount: 780, category: "Medical", paymentMethod: "UPI", date: daysAgo(9), merchant: "Apollo Pharmacy" },
  ];
}

export function seedIncomes(): Income[] {
  return [
    { id: uid("inc"), amount: 6000, type: "Freelance", source: "Design gig", date: daysAgo(4) },
  ];
}

export function seedBills(): Bill[] {
  return [
    { id: uid("bill"), name: "Electricity", amount: 1800, dueDay: 12, frequency: "monthly", category: "Utilities", paid: false },
    { id: uid("bill"), name: "Internet", amount: 999, dueDay: 15, frequency: "monthly", category: "Utilities", paid: false },
    { id: uid("bill"), name: "Netflix", amount: 499, dueDay: 20, frequency: "monthly", category: "Subscriptions", paid: true },
    { id: uid("bill"), name: "Spotify", amount: 119, dueDay: 22, frequency: "monthly", category: "Subscriptions", paid: false },
    { id: uid("bill"), name: "Home Loan EMI", amount: 5500, dueDay: 5, frequency: "monthly", category: "EMI", paid: true },
    { id: uid("bill"), name: "Phone Bill", amount: 599, dueDay: 18, frequency: "monthly", category: "Utilities", paid: false },
  ];
}

export function seedGoals(): Goal[] {
  return [
    { id: uid("goal"), name: "Emergency Fund", type: "Emergency Fund", target: 300000, saved: 180000, monthlyContribution: 10000 },
    { id: uid("goal"), name: "Goa Vacation", type: "Vacation", target: 60000, saved: 24000, monthlyContribution: 6000, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString() },
    { id: uid("goal"), name: "MacBook Pro", type: "Laptop", target: 180000, saved: 45000, monthlyContribution: 8000 },
  ];
}

export function seedInvestments(): Investment[] {
  return [
    { id: uid("inv"), name: "Nifty 50 Index", type: "SIP", invested: 120000, currentValue: 148000, monthly: 5000 },
    { id: uid("inv"), name: "Parag Parikh Flexi", type: "Mutual Funds", invested: 90000, currentValue: 112500, monthly: 3000 },
    { id: uid("inv"), name: "Digital Gold", type: "Gold", invested: 40000, currentValue: 47800, monthly: 2000 },
    { id: uid("inv"), name: "Bitcoin", type: "Crypto", invested: 30000, currentValue: 41200 },
  ];
}
