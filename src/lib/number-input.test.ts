import { describe, expect, it } from "vitest";
import {
  formatGrouped,
  normalizeOnBlur,
  parseAmount,
  sanitizeNumericInput,
  stripGrouping,
  toInputValue,
} from "./number-input";

describe("sanitizeNumericInput", () => {
  it("keeps empty input empty so it stays distinguishable from zero", () => {
    expect(sanitizeNumericInput("", 2)).toBe("");
    expect(sanitizeNumericInput("abc", 2)).toBe("");
  });

  it("preserves an explicit zero", () => {
    expect(sanitizeNumericInput("0", 2)).toBe("0");
    expect(sanitizeNumericInput("0.50", 2)).toBe("0.50");
  });

  it("strips characters that cannot appear in a decimal number", () => {
    expect(sanitizeNumericInput("1a2b3", 2)).toBe("123");
    expect(sanitizeNumericInput("₹1,200", 2)).toBe("1200");
    expect(sanitizeNumericInput("-45", 2)).toBe("45");
  });

  it("keeps only the first decimal separator", () => {
    expect(sanitizeNumericInput("12.3.4", 2)).toBe("12.34");
    expect(sanitizeNumericInput("1..2", 2)).toBe("1.2");
  });

  it("limits the fraction to the allowed number of places", () => {
    expect(sanitizeNumericInput("12.3456", 2)).toBe("12.34");
  });

  it("rejects any separator when decimals is 0", () => {
    expect(sanitizeNumericInput("15.9", 0)).toBe("159");
    expect(sanitizeNumericInput("31", 0)).toBe("31");
  });

  it("expands a leading separator into a leading zero", () => {
    expect(sanitizeNumericInput(".5", 2)).toBe("0.5");
    expect(sanitizeNumericInput(".", 2)).toBe("0.");
  });

  it("drops redundant leading zeros without eating a bare zero", () => {
    expect(sanitizeNumericInput("007", 2)).toBe("7");
    expect(sanitizeNumericInput("0", 0)).toBe("0");
  });

  it("keeps a trailing separator so the user can keep typing", () => {
    expect(sanitizeNumericInput("12.", 2)).toBe("12.");
  });
});

describe("normalizeOnBlur", () => {
  it("drops a dangling separator", () => {
    expect(normalizeOnBlur("12.")).toBe("12");
  });

  it("leaves complete values alone", () => {
    expect(normalizeOnBlur("12.50")).toBe("12.50");
    expect(normalizeOnBlur("")).toBe("");
  });
});

describe("formatGrouped", () => {
  it("uses lakh/crore grouping for the Indian locale", () => {
    expect(formatGrouped("1234567")).toBe("12,34,567");
    expect(formatGrouped("85000")).toBe("85,000");
  });

  it("leaves the fraction untouched", () => {
    expect(formatGrouped("1234.50")).toBe("1,234.50");
  });

  it("passes empty through", () => {
    expect(formatGrouped("")).toBe("");
  });

  it("groups zero as zero", () => {
    expect(formatGrouped("0")).toBe("0");
  });
});

describe("stripGrouping", () => {
  it("round-trips a grouped display value back to a raw one", () => {
    expect(stripGrouping(formatGrouped("1234567"), 2)).toBe("1234567");
    expect(stripGrouping(formatGrouped("1234.50"), 2)).toBe("1234.50");
  });
});

describe("parseAmount", () => {
  it("returns null rather than a silent zero for empty input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
  });

  it("parses real values including an explicit zero", () => {
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount("1234.50")).toBe(1234.5);
  });
});

describe("toInputValue", () => {
  it("renders absent values as empty, not zero", () => {
    expect(toInputValue(null)).toBe("");
    expect(toInputValue(undefined)).toBe("");
    expect(toInputValue(Number.NaN)).toBe("");
  });

  it("renders a stored zero as a visible zero", () => {
    expect(toInputValue(0)).toBe("0");
  });

  it("truncates when the field takes no decimals", () => {
    expect(toInputValue(15.9, 0)).toBe("15");
  });
});
