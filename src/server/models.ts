import { Schema, model, models, type InferSchemaType } from "mongoose";

const ExpenseSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    note: String,
    merchant: String,
    paymentMethod: { type: String, default: "UPI" },
    date: { type: Date, required: true, default: Date.now },
    recurring: { type: Boolean, default: false },
    favorite: { type: Boolean, default: false },
    tags: [String],
  },
  { timestamps: true }
);

const SalaryProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    salaryDay: { type: Number, default: 1 },
    cycle: { type: String, default: "monthly" },
    currency: { type: String, default: "INR" },
    country: { type: String, default: "India" },
    savingsGoal: { type: Number, default: 0 },
    emergencyFundGoal: { type: Number, default: 0 },
    investmentAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BillSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDay: { type: Number, default: 1 },
    frequency: { type: String, default: "monthly" },
    category: { type: String, default: "Utilities" },
    paid: { type: Boolean, default: false },
    // optional maturity date for bills (e.g., fixed-term bills or subscriptions)
    maturityDate: { type: Date },
  },
  { timestamps: true }
);

const GoalSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: "Custom" },
    target: { type: Number, required: true },
    saved: { type: Number, default: 0 },
    deadline: Date,
    monthlyContribution: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const InvestmentSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: "SIP" },
    invested: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    monthly: Number,
  },
  { timestamps: true }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    passwordHash: { type: String },
    emailVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type ExpenseDoc = InferSchemaType<typeof ExpenseSchema>;
export type SalaryProfileDoc = InferSchemaType<typeof SalaryProfileSchema>;
export type BillDoc = InferSchemaType<typeof BillSchema>;
export type GoalDoc = InferSchemaType<typeof GoalSchema>;
export type InvestmentDoc = InferSchemaType<typeof InvestmentSchema>;
export type UserDoc = InferSchemaType<typeof UserSchema>;

export const ExpenseModel =
  models.Expense || model("Expense", ExpenseSchema);
export const SalaryProfileModel =
  models.SalaryProfile || model("SalaryProfile", SalaryProfileSchema);
export const BillModel = models.Bill || model("Bill", BillSchema);
export const GoalModel = models.Goal || model("Goal", GoalSchema);
export const InvestmentModel =
  models.Investment || model("Investment", InvestmentSchema);
export const UserModel = models.User || model("User", UserSchema);

const SalaryHistorySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    source: { type: String, default: "salary" },
    confirmed: { type: Boolean, default: false },
    note: String,
  },
  { timestamps: true }
);

export type SalaryHistoryDoc = InferSchemaType<typeof SalaryHistorySchema>;
export const SalaryHistoryModel = models.SalaryHistory || model("SalaryHistory", SalaryHistorySchema);

// OTP schema for email verification
const OTPSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type OtpDoc = InferSchemaType<typeof OTPSchema>;
export const OtpModel = models.Otp || model("Otp", OTPSchema);
