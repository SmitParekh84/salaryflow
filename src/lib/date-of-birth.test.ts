import { describe, expect, it } from "vitest";
import { ageOn, isValidDateOfBirth } from "./date-of-birth";

describe("ageOn", () => {
  it("counts a birthday that has already passed this year", () => {
    expect(ageOn("1990-03-10", new Date("2026-08-16T00:00:00Z"))).toBe(36);
  });

  it("does not count a birthday still to come this year", () => {
    expect(ageOn("1990-12-25", new Date("2026-08-16T00:00:00Z"))).toBe(35);
  });

  it("counts the birthday itself as the new age", () => {
    expect(ageOn("1990-08-16", new Date("2026-08-16T00:00:00Z"))).toBe(36);
  });

  it("waits for March in a non-leap year to age a February 29th birthday", () => {
    // 2027 has no Feb 29. Turning 37 on Feb 28 would be a year early.
    expect(ageOn("2000-02-29", new Date("2027-02-28T00:00:00Z"))).toBe(26);
    expect(ageOn("2000-02-29", new Date("2027-03-01T00:00:00Z"))).toBe(27);
  });

  it("returns null for anything that is not a stored date", () => {
    expect(ageOn(null, new Date("2026-08-16T00:00:00Z"))).toBeNull();
    expect(ageOn(undefined, new Date("2026-08-16T00:00:00Z"))).toBeNull();
    expect(ageOn("", new Date("2026-08-16T00:00:00Z"))).toBeNull();
    expect(ageOn("not-a-date", new Date("2026-08-16T00:00:00Z"))).toBeNull();
  });
});

describe("isValidDateOfBirth", () => {
  const today = new Date("2026-08-16T00:00:00Z");

  it("accepts a plain YYYY-MM-DD date belonging to a plausible age", () => {
    expect(isValidDateOfBirth("1990-03-10", today)).toBe(true);
  });

  it("rejects a date in the future", () => {
    expect(isValidDateOfBirth("2027-01-01", today)).toBe(false);
  });

  it("rejects a day that does not exist in that month", () => {
    // Date() would roll 2001-02-30 forward to March, storing a date nobody entered.
    expect(isValidDateOfBirth("2001-02-30", today)).toBe(false);
    expect(isValidDateOfBirth("1999-13-01", today)).toBe(false);
  });

  it("rejects an age no account holder plausibly has", () => {
    expect(isValidDateOfBirth("2020-01-01", today)).toBe(false);
    expect(isValidDateOfBirth("1880-01-01", today)).toBe(false);
  });

  it("rejects a format other than YYYY-MM-DD", () => {
    expect(isValidDateOfBirth("10/03/1990", today)).toBe(false);
    expect(isValidDateOfBirth("1990-3-1", today)).toBe(false);
    expect(isValidDateOfBirth("1990-03-10T00:00:00Z", today)).toBe(false);
  });
});
