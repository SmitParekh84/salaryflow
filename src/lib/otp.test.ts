import { describe, expect, it } from "vitest";
import {
  firstEmptyIndex,
  isComplete,
  parsePastedOtp,
  removeDigitAt,
  sanitizeOtp,
  setDigitAt,
} from "./otp";

const LENGTH = 6;

describe("sanitizeOtp", () => {
  it("keeps digits only", () => {
    expect(sanitizeOtp("41a8-30 2", LENGTH)).toBe("418302");
  });

  it("truncates to the code length", () => {
    expect(sanitizeOtp("1234567890", LENGTH)).toBe("123456");
  });
});

describe("parsePastedOtp", () => {
  it("lifts the code out of surrounding text", () => {
    expect(parsePastedOtp("Your code is 418 302", LENGTH)).toBe("418302");
  });

  it("returns empty when the text holds no digits", () => {
    expect(parsePastedOtp("no code here", LENGTH)).toBe("");
  });
});

describe("setDigitAt", () => {
  it("writes a digit at the given box", () => {
    expect(setDigitAt("", 0, "4", LENGTH)).toBe("4");
    expect(setDigitAt("418", 1, "9", LENGTH)).toBe("498");
  });

  it("ignores non-digits", () => {
    expect(setDigitAt("418", 0, "x", LENGTH)).toBe("418");
    expect(setDigitAt("418", 0, "", LENGTH)).toBe("418");
  });

  it("ignores writes outside the code length", () => {
    expect(setDigitAt("418302", 6, "7", LENGTH)).toBe("418302");
    expect(setDigitAt("418", -1, "7", LENGTH)).toBe("418");
  });

  it("never grows past the code length", () => {
    expect(setDigitAt("418302", 5, "9", LENGTH)).toBe("418309");
  });
});

describe("removeDigitAt", () => {
  it("removes the digit at a box and closes the gap", () => {
    expect(removeDigitAt("418302", 0)).toBe("18302");
    expect(removeDigitAt("418302", 5)).toBe("41830");
  });

  it("is a no-op outside the filled range", () => {
    expect(removeDigitAt("418", 3)).toBe("418");
    expect(removeDigitAt("418", -1)).toBe("418");
  });
});

describe("firstEmptyIndex", () => {
  it("points at the next blank box", () => {
    expect(firstEmptyIndex("", LENGTH)).toBe(0);
    expect(firstEmptyIndex("418", LENGTH)).toBe(3);
  });

  it("stays on the last box once the code is full", () => {
    expect(firstEmptyIndex("418302", LENGTH)).toBe(5);
  });
});

describe("isComplete", () => {
  it("is true only at the exact code length", () => {
    expect(isComplete("41830", LENGTH)).toBe(false);
    expect(isComplete("418302", LENGTH)).toBe(true);
  });
});
