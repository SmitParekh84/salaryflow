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
    accountId: String,
    billId: String,
    billingMonth: String,
    shared: {
      type: new Schema(
        {
          totalAmount: { type: Number, required: true, min: 0 },
          friendName: { type: String, required: true },
          friendEmail: String,
          userPaid: { type: Number, required: true, min: 0 },
          friendPaid: { type: Number, required: true, min: 0 },
          inviteRequested: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      required: false,
    },
  },
  { timestamps: true },
);

const IncomeSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, required: true },
    source: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    accountId: String,
  },
  { timestamps: true },
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
  { timestamps: true },
);

const BillSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDay: { type: Number, default: 1 },
    dueDate: Date,
    frequency: { type: String, default: "monthly" },
    category: { type: String, default: "Utilities" },
    paid: { type: Boolean, default: false },
    // optional maturity date for bills (e.g., fixed-term bills or subscriptions)
    maturityDate: { type: Date },
    accountId: String,
  },
  { timestamps: true },
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
    contributions: [
      new Schema(
        {
          id: { type: String, required: true },
          amount: { type: Number, required: true, min: 0 },
          date: { type: Date, required: true, default: Date.now },
        },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);

const InvestmentSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: "SIP" },
    invested: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    monthly: Number,
    accountId: String,
  },
  { timestamps: true },
);

const BankAccountSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    bankName: { type: String, required: true },
    accountType: {
      type: String,
      enum: ["Savings", "Salary", "Current", "Other"],
      default: "Savings",
    },
    balance: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "closing"], default: "active" },
    plannedTransferTo: String,
    defaultFor: [
      {
        type: String,
        enum: ["everyday", "subscriptions", "investments", "obligations", "savings"],
      },
    ],
    maskBalance: { type: Boolean, default: false },
    hiddenFromAccounts: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const AccountTransferSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    sourceAccountId: { type: String, required: true },
    destinationAccountId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    note: String,
    status: { type: String, enum: ["scheduled", "completed"], default: "scheduled" },
    completedAt: Date,
    balancesApplied: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const CreditCardSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    bankName: { type: String, required: true },
    creditLimit: { type: Number, required: true, min: 0 },
    statementDay: { type: Number, required: true, min: 1, max: 31 },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true },
);

const BudgetRuleSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    templateKey: String,
    active: { type: Boolean, default: false },
    allocations: {
      type: [
        new Schema(
          {
            kind: {
              type: String,
              enum: ["needs", "wants", "savings", "investments"],
              required: true,
            },
            label: { type: String, required: true },
            percentage: { type: Number, required: true, min: 0, max: 100 },
          },
          { _id: false },
        ),
      ],
      validate: {
        validator: (allocations: { percentage: number }[]) =>
          allocations.reduce((sum, allocation) => sum + allocation.percentage, 0) === 100,
        message: "Budget allocations must total 100%",
      },
    },
  },
  { timestamps: true },
);

const RecycleBinSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    label: { type: String, required: true },
    deletedAt: { type: Date, required: true, default: Date.now },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    passwordHash: { type: String },
    emailVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ExpenseDoc = InferSchemaType<typeof ExpenseSchema>;
export type IncomeDoc = InferSchemaType<typeof IncomeSchema>;
export type SalaryProfileDoc = InferSchemaType<typeof SalaryProfileSchema>;
export type BillDoc = InferSchemaType<typeof BillSchema>;
export type GoalDoc = InferSchemaType<typeof GoalSchema>;
export type InvestmentDoc = InferSchemaType<typeof InvestmentSchema>;
export type BankAccountDoc = InferSchemaType<typeof BankAccountSchema>;
export type AccountTransferDoc = InferSchemaType<typeof AccountTransferSchema>;
export type CreditCardDoc = InferSchemaType<typeof CreditCardSchema>;
export type BudgetRuleDoc = InferSchemaType<typeof BudgetRuleSchema>;
export type RecycleBinDoc = InferSchemaType<typeof RecycleBinSchema>;
export type UserDoc = InferSchemaType<typeof UserSchema>;

export const ExpenseModel = models.Expense || model("Expense", ExpenseSchema);
export const IncomeModel = models.Income || model("Income", IncomeSchema);
export const SalaryProfileModel =
  models.SalaryProfile || model("SalaryProfile", SalaryProfileSchema);
export const BillModel = models.Bill || model("Bill", BillSchema);
export const GoalModel = models.Goal || model("Goal", GoalSchema);
export const InvestmentModel = models.Investment || model("Investment", InvestmentSchema);
export const BankAccountModel = models.BankAccount || model("BankAccount", BankAccountSchema);
export const AccountTransferModel =
  models.AccountTransfer || model("AccountTransfer", AccountTransferSchema);
export const CreditCardModel = models.CreditCard || model("CreditCard", CreditCardSchema);
export const BudgetRuleModel = models.BudgetRule || model("BudgetRule", BudgetRuleSchema);
export const RecycleBinModel = models.RecycleBin || model("RecycleBin", RecycleBinSchema);
export const UserModel = models.User || model("User", UserSchema);

const SharedExpenseInviteSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    recipientUserId: { type: String, index: true },
    friendName: { type: String, required: true },
    friendEmail: { type: String, required: true, lowercase: true, index: true },
    title: { type: String, required: true },
    expenseDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    ownerPaid: { type: Number, required: true, min: 0 },
    friendPaid: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  },
  { timestamps: true },
);

export type SharedExpenseInviteDoc = InferSchemaType<typeof SharedExpenseInviteSchema>;
export const SharedExpenseInviteModel =
  models.SharedExpenseInvite || model("SharedExpenseInvite", SharedExpenseInviteSchema);

const SalaryHistorySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    source: { type: String, default: "salary" },
    confirmed: { type: Boolean, default: false },
    note: String,
    baseAmount: Number,
    varianceAmount: Number,
    varianceKind: { type: String, enum: ["allowance", "deduction", "none"], default: "none" },
  },
  { timestamps: true },
);

export type SalaryHistoryDoc = InferSchemaType<typeof SalaryHistorySchema>;
export const SalaryHistoryModel =
  models.SalaryHistory || model("SalaryHistory", SalaryHistorySchema);

// OTP schema for email verification
const OTPSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type OtpDoc = InferSchemaType<typeof OTPSchema>;
export const OtpModel = models.Otp || model("Otp", OTPSchema);
