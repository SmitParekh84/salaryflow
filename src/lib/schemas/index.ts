import { z } from "zod";
import {
  dayOfMonth,
  money,
  optionalEmail,
  optionalMoney,
  optionalNumber,
  optionalText,
  percentage,
  positiveMoney,
  requiredEmail,
  requiredNumber,
  requiredText,
} from "./primitives";

/**
 * Domain schemas, shared by the API routes and the client forms.
 *
 * Each shape matches what the corresponding route already accepted, so adopting
 * one is a substitution rather than a contract change. What they add is the
 * range enforcement the old `type="number"` inputs only advertised: `min`/`max`
 * attributes are hints a browser applies to its spinner, not rules — any value
 * that reached `Number()` bypassed them entirely.
 */

export const EXPENSE_AMOUNT_MESSAGE = "Enter an amount greater than 0";

/**
 * Whether an expense amount is recordable.
 *
 * Your share of a split may legitimately be zero: a friend can cover the whole
 * bill, or pay you back in full, and the group spend is still worth keeping on
 * the Shared page. Requiring a positive amount everywhere made those bills
 * impossible to enter at all. Every other expense must still be above zero —
 * a blank amount is a mistake, not a record.
 */
export function expenseAmountIsValid(amount: number, isShared: boolean) {
  return isShared ? amount >= 0 : amount > 0;
}

export const ACCOUNT_TYPES = ["Savings", "Salary", "Current", "Other"] as const;
export const ACCOUNT_STATUSES = ["active", "closing", "closed"] as const;

export const accountSchema = z.object({
  bankName: requiredText("bank name"),
  accountType: z.enum(ACCOUNT_TYPES, { error: "Choose an account type" }),
  balance: money("balance"),
  status: z.enum(ACCOUNT_STATUSES).default("active"),
  plannedTransferTo: optionalText(120),
});
export type AccountInput = z.input<typeof accountSchema>;

export const creditCardSchema = z.object({
  bankName: requiredText("card name"),
  creditLimit: positiveMoney("credit limit"),
  statementDay: dayOfMonth("statement day"),
  dueDay: dayOfMonth("due day").optional(),
});
export type CreditCardInput = z.input<typeof creditCardSchema>;

export const transferSchema = z
  .object({
    fromAccountId: requiredText("source account"),
    toAccountId: requiredText("destination account"),
    amount: positiveMoney("amount"),
    goalId: optionalText(120),
    goalAmount: optionalMoney("reserved amount"),
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    path: ["toAccountId"],
    message: "Choose a different destination account",
  })
  .refine((values) => (values.goalAmount ?? 0) <= values.amount, {
    path: ["goalAmount"],
    message: "Reserved amount cannot exceed the transfer",
  });
export type TransferInput = z.input<typeof transferSchema>;

export const billSchema = z.object({
  name: requiredText("bill name"),
  amount: positiveMoney("amount"),
  dueDate: optionalText(40),
  frequency: optionalText(40),
  paid: z.boolean().optional(),
  note: optionalText(),
  intervalDays: requiredNumber({
    min: 1,
    max: 3650,
    integer: true,
    label: "interval",
  }).optional(),
});
export type BillInput = z.input<typeof billSchema>;

export const goalSchema = z.object({
  name: requiredText("goal name"),
  type: optionalText(40),
  target: positiveMoney("target"),
  saved: optionalMoney("saved amount"),
  monthlyContribution: optionalMoney("monthly contribution"),
  deadline: optionalText(40),
});
export type GoalInput = z.input<typeof goalSchema>;

export const investmentSchema = z.object({
  name: requiredText("investment name"),
  type: optionalText(40),
  invested: positiveMoney("invested amount"),
  currentValue: optionalMoney("current value"),
  monthly: optionalMoney("monthly SIP"),
  frequency: optionalText(40),
  note: optionalText(),
  accountId: optionalText(120),
});
export type InvestmentInput = z.input<typeof investmentSchema>;

export const salaryProfileSchema = z.object({
  amount: money("salary"),
  salaryDay: dayOfMonth("salary day"),
  cycle: optionalText(40),
  currency: optionalText(10),
  country: optionalText(60),
  savingsGoal: optionalMoney("savings goal"),
  emergencyFundGoal: optionalMoney("emergency fund target"),
  investmentAmount: optionalMoney("investment amount"),
});
export type SalaryProfileInput = z.input<typeof salaryProfileSchema>;

/**
 * Budget-rule split. The bounds matter here: the old input advertised max=100
 * per bucket but wrote whatever `Number()` returned, so a 500% share was
 * storable.
 */
export const budgetRuleSchema = z
  .object({
    name: requiredText("rule name", 80),
    needs: percentage("needs share"),
    wants: percentage("wants share"),
    savings: percentage("cash savings share"),
    investments: percentage("investments share"),
  })
  .refine(
    (values) =>
      Math.abs(values.needs + values.wants + values.savings + values.investments - 100) < 0.01,
    { path: ["needs"], message: "The four shares must add up to 100%" },
  );
export type BudgetRuleInput = z.input<typeof budgetRuleSchema>;

export const onboardingSchema = z.object({
  amount: money("salary"),
  salaryDay: dayOfMonth("salary day"),
  savingsGoal: optionalMoney("savings goal"),
  emergencyFundGoal: optionalMoney("emergency fund target"),
  currency: optionalText(10),
  country: optionalText(60),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

// --- Auth ---

export const OTP_LENGTH = 6;

export const otpSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit verification code`);

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Password cannot exceed 128 characters");

export const loginSchema = z.object({
  email: requiredEmail,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: requiredText("name", 80),
  email: requiredEmail,
  password: passwordSchema,
  otp: otpSchema,
});

export const resetPasswordSchema = z.object({
  email: requiredEmail,
  otp: otpSchema,
  password: passwordSchema,
});

export { optionalEmail, optionalNumber, requiredEmail };
