import { describe, expect, it } from "vitest";
import { filterSuggestions, friendNameSuggestions, merchantSuggestions } from "./suggestions";
import type { Expense } from "./types";

function expense(patch: Partial<Expense> & { id: string }): Expense {
  return {
    amount: 100,
    category: "Food",
    paymentMethod: "UPI",
    date: "2026-08-01T12:00:00.000Z",
    ...patch,
  } as Expense;
}

describe("merchantSuggestions", () => {
  it("ranks the places used most often first", () => {
    const expenses = [
      expense({ id: "1", merchant: "Blinkit" }),
      expense({ id: "2", merchant: "Swiggy" }),
      expense({ id: "3", merchant: "Blinkit" }),
      expense({ id: "4", merchant: "Blinkit" }),
      expense({ id: "5", merchant: "Swiggy" }),
      expense({ id: "6", merchant: "Zepto" }),
    ];

    expect(merchantSuggestions(expenses)).toEqual(["Blinkit", "Swiggy", "Zepto"]);
  });

  it("breaks a tie on how recently the place was used", () => {
    const expenses = [
      expense({ id: "old", merchant: "Dmart", date: "2026-07-01T12:00:00.000Z" }),
      expense({ id: "new", merchant: "Zepto", date: "2026-08-12T12:00:00.000Z" }),
    ];

    expect(merchantSuggestions(expenses)).toEqual(["Zepto", "Dmart"]);
  });

  it("treats one place typed in different cases as one place", () => {
    const expenses = [
      expense({ id: "1", merchant: "blinkit", date: "2026-08-01T12:00:00.000Z" }),
      expense({ id: "2", merchant: "BLINKIT", date: "2026-08-02T12:00:00.000Z" }),
      expense({ id: "3", merchant: "Blinkit", date: "2026-08-03T12:00:00.000Z" }),
    ];

    // One entry, spelled the way it was typed most recently.
    expect(merchantSuggestions(expenses)).toEqual(["Blinkit"]);
  });

  it("ignores missing and blank places", () => {
    const expenses = [
      expense({ id: "1" }),
      expense({ id: "2", merchant: "   " }),
      expense({ id: "3", merchant: " Gokul Dairy " }),
    ];

    expect(merchantSuggestions(expenses)).toEqual(["Gokul Dairy"]);
  });
});

describe("friendNameSuggestions", () => {
  it("collects the friends on past splits, most used first", () => {
    const expenses = [
      expense({
        id: "1",
        shared: { totalAmount: 100, friendName: "Swarali", userPaid: 50, friendPaid: 50 },
      }),
      expense({
        id: "2",
        shared: { totalAmount: 100, friendName: "Dhariya", userPaid: 50, friendPaid: 50 },
      }),
      expense({
        id: "3",
        shared: { totalAmount: 100, friendName: "swarali", userPaid: 50, friendPaid: 50 },
      }),
    ];

    expect(friendNameSuggestions(expenses)).toEqual(["swarali", "Dhariya"]);
  });

  it("ignores expenses that are not splits", () => {
    expect(friendNameSuggestions([expense({ id: "1", merchant: "Blinkit" })])).toEqual([]);
  });
});

describe("filterSuggestions", () => {
  const all = ["Blinkit", "Bank charges", "Narnarayan Fuel Point", "Swiggy"];

  it("returns everything when nothing has been typed", () => {
    expect(filterSuggestions(all, "")).toEqual(all);
  });

  it("matches anywhere in the name, ignoring case", () => {
    expect(filterSuggestions(all, "fuel")).toEqual(["Narnarayan Fuel Point"]);
  });

  it("puts names that start with what was typed above names that merely contain it", () => {
    expect(filterSuggestions(["Fuel Point", "Narnarayan Fuel"], "fuel")).toEqual([
      "Fuel Point",
      "Narnarayan Fuel",
    ]);
  });

  it("does not suggest what has already been typed in full", () => {
    expect(filterSuggestions(all, "Blinkit")).toEqual([]);
  });

  it("caps how many are offered", () => {
    expect(filterSuggestions(all, "", 2)).toHaveLength(2);
  });
});
