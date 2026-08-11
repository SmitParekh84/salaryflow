import { describe, expect, it } from "vitest";
import {
  accountSchema,
  billSchema,
  budgetRuleSchema,
  creditCardSchema,
  goalSchema,
  investmentSchema,
  otpSchema,
  salaryProfileSchema,
  transferSchema,
} from "./index";

type SafeParseLike = { success: boolean; error?: { issues: { message: string }[] } };

function firstError(schema: { safeParse: (value: unknown) => SafeParseLike }, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? null : (result.error?.issues[0]?.message ?? "");
}

describe("accountSchema", () => {
  const valid = { bankName: "HDFC", accountType: "Savings", balance: "50000" };

  it("accepts a form payload of strings", () => {
    expect(accountSchema.parse(valid)).toMatchObject({ bankName: "HDFC", balance: 50000 });
  });

  it("accepts the numeric payload an API route receives", () => {
    expect(accountSchema.parse({ ...valid, balance: 50000 }).balance).toBe(50000);
  });

  it("defaults status to active", () => {
    expect(accountSchema.parse(valid).status).toBe("active");
  });

  it("rejects a blank balance rather than storing zero", () => {
    expect(firstError(accountSchema, { ...valid, balance: "" })).toBe("Balance is required");
  });

  it("rejects an unknown account type", () => {
    expect(firstError(accountSchema, { ...valid, accountType: "Crypto" })).toBe(
      "Choose an account type",
    );
  });
});

describe("creditCardSchema", () => {
  const valid = { bankName: "Amex", creditLimit: "200000", statementDay: "12" };

  it("accepts a valid card", () => {
    expect(creditCardSchema.parse(valid).statementDay).toBe(12);
  });

  it("rejects a statement day past the end of a month", () => {
    // The old input carried max={31} but wrote whatever Number() produced.
    expect(firstError(creditCardSchema, { ...valid, statementDay: "99" })).toBe(
      "Statement day cannot exceed 31",
    );
  });

  it("rejects a zero credit limit", () => {
    expect(firstError(creditCardSchema, { ...valid, creditLimit: "0" })).toBe(
      "Credit limit must be greater than 0",
    );
  });
});

describe("transferSchema", () => {
  const valid = { fromAccountId: "a", toAccountId: "b", amount: "5000" };

  it("accepts a straightforward transfer", () => {
    expect(transferSchema.parse(valid).amount).toBe(5000);
  });

  it("refuses a transfer into the same account", () => {
    expect(firstError(transferSchema, { ...valid, toAccountId: "a" })).toBe(
      "Choose a different destination account",
    );
  });

  it("refuses reserving more for a goal than the transfer carries", () => {
    expect(firstError(transferSchema, { ...valid, goalAmount: "9000" })).toBe(
      "Reserved amount cannot exceed the transfer",
    );
  });

  it("allows reserving the whole transfer", () => {
    expect(transferSchema.parse({ ...valid, goalAmount: "5000" }).goalAmount).toBe(5000);
  });
});

describe("budgetRuleSchema", () => {
  it("accepts a split that adds to 100", () => {
    expect(budgetRuleSchema.parse({ needs: "50", wants: "30", savings: "20" }).needs).toBe(50);
  });

  it("rejects a split that does not add to 100", () => {
    expect(firstError(budgetRuleSchema, { needs: "50", wants: "30", savings: "30" })).toBe(
      "The three shares must add up to 100%",
    );
  });

  it("rejects a share above 100", () => {
    expect(firstError(budgetRuleSchema, { needs: "500", wants: "0", savings: "0" })).toBe(
      "Needs share cannot exceed 100",
    );
  });
});

describe("billSchema", () => {
  it("rejects a zero amount", () => {
    expect(firstError(billSchema, { name: "Rent", amount: "0" })).toBe(
      "Amount must be greater than 0",
    );
  });

  it("rejects an interval beyond ten years", () => {
    expect(firstError(billSchema, { name: "Rent", amount: "100", intervalDays: "4000" })).toBe(
      "Interval cannot exceed 3650",
    );
  });
});

describe("goalSchema", () => {
  it("treats optional money left blank as absent, not zero", () => {
    const parsed = goalSchema.parse({ name: "Car", target: "500000", saved: "" });
    expect(parsed.saved).toBeUndefined();
  });
});

describe("investmentSchema", () => {
  it("keeps an explicit zero for invested amount", () => {
    expect(investmentSchema.parse({ type: "Index fund", invested: "0" }).invested).toBe(0);
  });
});

describe("salaryProfileSchema", () => {
  it("rejects a salary day of 0", () => {
    expect(firstError(salaryProfileSchema, { amount: "85000", salaryDay: "0" })).toBe(
      "Salary day must be at least 1",
    );
  });
});

describe("otpSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpSchema.parse("418302")).toBe("418302");
  });

  it("rejects a short or non-numeric code", () => {
    expect(firstError(otpSchema, "4183")).toBe("Enter the 6-digit verification code");
    expect(firstError(otpSchema, "41830a")).toBe("Enter the 6-digit verification code");
  });
});
