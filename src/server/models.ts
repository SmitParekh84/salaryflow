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
    balanceApplied: { type: Boolean, default: false },
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
    fuel: {
      type: new Schema(
        {
          odometerKm: { type: Number, min: 0 },
          litres: { type: Number, required: true, min: 0 },
          ratePerLitre: { type: Number, required: true, min: 0 },
          rateSource: { type: String, default: "manual" },
          includeInAverage: { type: Boolean },
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
    financialYearStart: Number,
    /**
     * Chosen profile picture, by id. Stored here rather than on the user
     * document because this is the object sync already carries both ways, so
     * the choice follows the person to their other devices. An id, not a path —
     * see src/lib/avatars.ts.
     */
    avatar: String,
    customCategories: [
      new Schema(
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          icon: { type: String, required: true },
          color: { type: String, required: true },
        },
        { _id: false },
      ),
    ],
    city: String,
    vehicle: {
      type: new Schema(
        {
          name: { type: String, required: true },
          year: Number,
          minKmpl: { type: Number, required: true, min: 1 },
          maxKmpl: { type: Number, required: true, min: 1 },
        },
        { _id: false },
      ),
      required: false,
    },
    catchUpReviewedDates: [String],
    catchUpDismissedUntil: String,
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
    intervalDays: { type: Number, min: 1 },
    category: { type: String, default: "Utilities" },
    paid: { type: Boolean, default: false },
    provider: String,
    purchaseDate: Date,
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
    balanceAccountId: String,
    preferredAccountId: String,
    contributions: [
      new Schema(
        {
          id: { type: String, required: true },
          amount: { type: Number, required: true, min: 0 },
          date: { type: Date, required: true, default: Date.now },
          accountId: String,
          transferId: String,
          opening: { type: Boolean, default: false },
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
    status: { type: String, enum: ["active", "closing", "closed"], default: "active" },
    plannedTransferTo: String,
    defaultFor: [
      {
        type: String,
        enum: ["everyday", "subscriptions", "investments", "obligations", "savings"],
      },
    ],
    maskBalance: { type: Boolean, default: false },
    hiddenFromAccounts: { type: Boolean, default: false },
    balanceVerifiedAt: Date,
    adjustments: [
      new Schema(
        {
          id: { type: String, required: true },
          date: { type: Date, required: true },
          amount: { type: Number, required: true },
          note: String,
        },
        { _id: false },
      ),
    ],
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
    goalId: String,
    goalAmount: { type: Number, min: 0 },
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

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ["salary", "bill", "overspend", "goal", "shared", "info"],
      default: "info",
    },
    read: { type: Boolean, default: false },
    href: String,
    dedupeKey: String,
  },
  { timestamps: true },
);

NotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    passwordHash: { type: String },
    emailVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    /**
     * Whether an admin has let this account in.
     *
     * Deliberately has NO default, and there is no backfill migration.
     * Mongoose applies defaults when a document is created, never
     * retroactively, so every user predating this field reads back
     * `undefined` — and the login gate blocks only an explicit "pending" or
     * "rejected". Absent therefore means approved, which is what makes
     * deploying this incapable of locking out an existing account, including
     * the admins who would otherwise have to approve themselves. Same
     * defensive read as `onboardingCompleted` in the login route.
     *
     * A `default: "pending"` here looks harmless and is the trap: it changes
     * nothing about existing rows, so any read path treating `undefined` as
     * pending locks out the whole user base at once.
     */
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], index: true },
    approvalDecidedAt: { type: Date },
    approvalDecidedBy: { type: String },
    sessionVersion: { type: Number, default: 0, select: false },
    /**
     * Demo account only. When the shared demo data was last rebuilt — the demo
     * login re-seeds only once this goes stale, so the common case is a single
     * indexed write instead of a full wipe-and-insert. See src/server/demo-seed.ts.
     */
    demoSeededAt: { type: Date },
  },
  { timestamps: true },
);

const WaitlistSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

/* ---------------------------------------------------------------------------
   Sync identity
   ---------------------------------------------------------------------------
   Every collection the client mirrors needs a stable identity that survives a
   round-trip. Mongo's `_id` cannot serve: the client mints ids like `exp_1a2b3c`
   before the server has ever seen the item, so `clientId` carries that value and
   is what sync upserts match on.

   `removedAt` is a tombstone. Deleting a row outright would let a second device
   that has not pulled yet re-create it on its next push, so rows are marked and
   filtered out on read instead. The name avoids colliding with RecycleBin's own
   `deletedAt`, which is a user-facing timestamp with a different meaning.
   --------------------------------------------------------------------------- */
const SYNCED_SCHEMAS = [
  ExpenseSchema,
  IncomeSchema,
  BillSchema,
  GoalSchema,
  InvestmentSchema,
  BankAccountSchema,
  AccountTransferSchema,
  CreditCardSchema,
  BudgetRuleSchema,
  RecycleBinSchema,
];

for (const schema of SYNCED_SCHEMAS) {
  schema.add({
    clientId: { type: String },
    removedAt: { type: Date, default: null },
  });
  // Partial rather than sparse: a compound sparse index only skips documents
  // missing *every* key, and `userId` is always present — so pre-migration rows
  // without a clientId would collide on `null`.
  schema.index(
    { userId: 1, clientId: 1 },
    { unique: true, partialFilterExpression: { clientId: { $type: "string" } } },
  );
}

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
export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;
export type UserDoc = InferSchemaType<typeof UserSchema>;
export type WaitlistDoc = InferSchemaType<typeof WaitlistSchema>;

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
export const NotificationModel = models.Notification || model("Notification", NotificationSchema);
export const UserModel = models.User || model("User", UserSchema);
export const WaitlistModel = models.Waitlist || model("Waitlist", WaitlistSchema);

const RateLimitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0 },
    resetAt: { type: Date, required: true },
  },
  { timestamps: true },
);

RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitDoc = InferSchemaType<typeof RateLimitSchema>;
export const RateLimitModel = models.RateLimit || model("RateLimit", RateLimitSchema);

const AdminAuditSchema = new Schema(
  {
    adminId: { type: String, required: true, index: true },
    targetUserId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["promote", "demote", "delete", "approve", "reject"],
      required: true,
    },
  },
  { timestamps: true },
);

export type AdminAuditDoc = InferSchemaType<typeof AdminAuditSchema>;
export const AdminAuditModel = models.AdminAudit || model("AdminAudit", AdminAuditSchema);

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

/* ---------------------------------------------------------------------------
   Finance assistant
   ---------------------------------------------------------------------------
   Facts about the person that the rest of Aartha has no reason to store. A
   term-cover answer needs to know who depends on this income and what is
   already covered, and none of that can be derived from expenses or bills.

   Every field is optional on purpose. The assistant asks for what it needs
   when it needs it, so a half-filled record is the normal state, not an error.
   Absent means "never told us" and is what makes the assistant ask rather
   than assume.
   --------------------------------------------------------------------------- */
const FinancialProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    /** Plain `YYYY-MM-DD`: a birthday is a calendar date, not an instant. */
    dateOfBirth: String,
    /** Legacy. Records written before birthdays; age is derived from dateOfBirth now. */
    age: Number,
    dependents: Number,
    existingLifeCover: Number,
    existingHealthCover: Number,
    outstandingLoans: Number,
    spouseIncome: Number,
  },
  { timestamps: true },
);

export type FinancialProfileDoc = InferSchemaType<typeof FinancialProfileSchema>;
export const FinancialProfileModel =
  models.FinancialProfile || model("FinancialProfile", FinancialProfileSchema);

const ChatMessageSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["user", "model"], required: true },
    text: { type: String, required: true },
    /** Which model answered, kept so a bad run can be traced to a fallback. */
    modelId: String,
  },
  { timestamps: true },
);

// History is always read as "the last N turns for this user".
ChatMessageSchema.index({ userId: 1, createdAt: -1 });

export type ChatMessageDoc = InferSchemaType<typeof ChatMessageSchema>;
export const ChatMessageModel = models.ChatMessage || model("ChatMessage", ChatMessageSchema);
