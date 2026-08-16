import { describe, expect, it } from "vitest";
import { callGemini } from "@/lib/gemini";
import type { FinancialContext } from "./context";
import { renderContext, SYSTEM_PROMPT } from "./prompt";
import { parseAssistantReply } from "./reply";

/* ---------------------------------------------------------------------------
   Opt-in live check against the real Gemini API.

   Skipped by default. The free tier allows roughly 20 requests a day, so
   running this on every `pnpm test` would exhaust the assistant's quota for
   real users. Enable deliberately:

     GEMINI_LIVE_TEST=1 GEMINI_API_KEY=... pnpm vitest run src/features/chat/gemini.live.test.ts

   It asserts on structure and refusals, never on wording — model output varies
   between runs and a wording assertion would be flaky by construction.
   --------------------------------------------------------------------------- */

const live = process.env.GEMINI_LIVE_TEST === "1" && Boolean(process.env.GEMINI_API_KEY);

const context: FinancialContext = {
  currency: "INR",
  monthlyIncome: 80_000,
  avgMonthlySpend: 32_000,
  spendByCategory: [
    { category: "Food", monthlyAvg: 12_000 },
    { category: "Rent", monthlyAvg: 15_000 },
    { category: "Fuel", monthlyAvg: 5_000 },
  ],
  totalMonthlyBills: 18_000,
  monthlyEmi: 4_500,
  monthlyInsurancePremium: 825,
  investments: [
    { name: "Index fund", type: "SIP", invested: 60_000, currentValue: 71_000, monthly: 5_000 },
  ],
  monthlySipTotal: 5_000,
  goals: [
    {
      name: "Emergency Fund",
      type: "Emergency Fund",
      target: 300_000,
      saved: 60_000,
      monthlyContribution: 5_000,
    },
  ],
  totalLiquidBalance: 120_000,
  emergencyFundMonths: 2.4,
  profile: {
    age: 28,
    dependents: null,
    existingLifeCover: null,
    existingHealthCover: 500_000,
    outstandingLoans: null,
    spouseIncome: null,
  },
};

const ask = async (question: string) => {
  const { text } = await callGemini({
    system: SYSTEM_PROMPT,
    history: [],
    message: `${renderContext(context)}\n\nQUESTION\n${question}`,
  });
  return parseAssistantReply(text);
};

describe.skipIf(!live)("Gemini, live", () => {
  it("answers the term insurance question in the agreed envelope", async () => {
    const result = await ask(
      "I already pay 825 rupees a month to HDFC Ergo for health insurance. Do I still need term insurance?",
    );

    expect(result.reply.length).toBeGreaterThan(80);
    // Dependents is unknown, so a cover figure cannot honestly be given yet.
    expect(result.reply.toLowerCase()).toContain("depend");
    console.log("\n--- reply ---\n" + result.reply + "\n");
  });

  it("does not invent a figure that was never supplied", async () => {
    const result = await ask("What is my exact credit score?");

    // Nothing in the context carries a credit score, so it must decline.
    expect(result.reply).not.toMatch(/\b(7|8)\d{2}\b/);
    console.log("\n--- reply ---\n" + result.reply + "\n");
  });

  it("records a fact the user states, and only that fact", async () => {
    const result = await ask("I have 2 dependents. Should I get term cover?");

    expect(result.profileUpdates.dependents).toBe(2);
    expect(Object.keys(result.profileUpdates)).toEqual(["dependents"]);
  });
});
