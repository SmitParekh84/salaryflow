import { describe, expect, it } from "vitest";
import {
  dayOfMonth,
  money,
  optionalEmail,
  optionalMoney,
  optionalText,
  percentage,
  positiveMoney,
  requiredNumber,
  requiredText,
} from "./primitives";

function parseError(schema: { safeParse: (value: unknown) => SafeParseLike }, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? null : (result.error?.issues[0]?.message ?? "");
}

type SafeParseLike = { success: boolean; error?: { issues: { message: string }[] } };

describe("required number fields", () => {
  const salary = money("salary");

  it("accepts the number an API route receives as JSON", () => {
    expect(salary.parse(85000)).toBe(85000);
  });

  it("accepts the string a form field holds", () => {
    expect(salary.parse("85000")).toBe(85000);
    expect(salary.parse("1234.50")).toBe(1234.5);
  });

  it("treats a blank field as missing rather than zero", () => {
    // The whole point of this layer: "" must never become 0.
    expect(salary.safeParse("").success).toBe(false);
    expect(parseError(salary, "")).toBe("Salary is required");
    expect(parseError(salary, "   ")).toBe("Salary is required");
  });

  it("rejects a missing value", () => {
    expect(parseError(salary, undefined)).toBe("Salary is required");
    expect(parseError(salary, null)).toBe("Salary is required");
  });

  it("rejects text that is not a number instead of coercing it to zero", () => {
    expect(parseError(salary, "abc")).toBe("Enter a valid salary");
  });

  it("accepts an explicit zero", () => {
    expect(salary.parse("0")).toBe(0);
    expect(salary.parse(0)).toBe(0);
  });

  it("rejects negatives", () => {
    expect(parseError(salary, "-5")).toBe("Salary cannot be negative");
  });
});

describe("positiveMoney", () => {
  const amount = positiveMoney("amount");

  it("rejects zero, unlike a plain money field", () => {
    expect(parseError(amount, "0")).toBe("Amount must be greater than 0");
  });

  it("accepts anything above zero", () => {
    expect(amount.parse("0.01")).toBe(0.01);
  });
});

describe("optionalMoney", () => {
  const monthly = optionalMoney("monthly amount");

  it("allows the field to be left empty", () => {
    expect(monthly.parse("")).toBeUndefined();
    expect(monthly.parse(undefined)).toBeUndefined();
  });

  it("still validates a value that is present", () => {
    expect(monthly.parse("500")).toBe(500);
    expect(parseError(monthly, "-1")).toBe("Monthly amount cannot be negative");
  });
});

describe("dayOfMonth", () => {
  const salaryDay = dayOfMonth("salary day");

  it("accepts the valid range", () => {
    expect(salaryDay.parse("1")).toBe(1);
    expect(salaryDay.parse("31")).toBe(31);
  });

  it("rejects days outside the month — the bound the old inputs ignored", () => {
    expect(parseError(salaryDay, "0")).toBe("Salary day must be at least 1");
    expect(parseError(salaryDay, "32")).toBe("Salary day cannot exceed 31");
    expect(parseError(salaryDay, "99")).toBe("Salary day cannot exceed 31");
  });

  it("rejects a fractional day", () => {
    expect(parseError(salaryDay, "15.5")).toBe("Salary day must be a whole number");
  });
});

describe("percentage", () => {
  const share = percentage("needs percentage");

  it("accepts the full range", () => {
    expect(share.parse("0")).toBe(0);
    expect(share.parse("100")).toBe(100);
  });

  it("rejects values above 100 — the bound the old rules input ignored", () => {
    expect(parseError(share, "500")).toBe("Needs percentage cannot exceed 100");
  });
});

describe("requiredNumber with an explicit range", () => {
  const interval = requiredNumber({ min: 1, max: 3650, integer: true, label: "interval" });

  it("enforces both bounds", () => {
    expect(interval.parse("30")).toBe(30);
    expect(parseError(interval, "0")).toBe("Interval must be at least 1");
    expect(parseError(interval, "4000")).toBe("Interval cannot exceed 3650");
  });
});

describe("text fields", () => {
  it("requires a non-blank name", () => {
    const name = requiredText("bank name");
    expect(name.parse("  HDFC  ")).toBe("HDFC");
    expect(parseError(name, "   ")).toBe("Bank name is required");
  });

  it("treats an empty optional note as absent", () => {
    expect(optionalText().parse("")).toBeUndefined();
    expect(optionalText().parse(" hello ")).toBe("hello");
  });
});

describe("email fields", () => {
  it("allows an optional email to be blank", () => {
    expect(optionalEmail.safeParse("").success).toBe(true);
    expect(optionalEmail.safeParse(undefined).success).toBe(true);
  });

  it("rejects a malformed optional email that is present", () => {
    expect(optionalEmail.safeParse("not-an-email").success).toBe(false);
  });
});

