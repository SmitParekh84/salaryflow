import type { FinancialContext, FinancialProfile } from "./context";

/** Profile keys the model may fill in. Mirrored by the zod guard in the route. */
export const PROFILE_FIELDS = [
  "age",
  "dependents",
  "existingLifeCover",
  "existingHealthCover",
  "outstandingLoans",
  "spouseIncome",
] as const satisfies readonly (keyof FinancialProfile)[];

const NONE = "none recorded";

function money(currency: string, value: number) {
  return `${value} ${currency}`;
}

function renderProfile(profile: FinancialProfile) {
  return PROFILE_FIELDS.map((field) => {
    const value = profile[field];
    return `- ${field}: ${value === null || value === undefined ? "unknown" : value}`;
  }).join("\n");
}

/**
 * The user's finances as plain text for the model.
 *
 * Unknown profile fields are printed as "unknown" rather than dropped. An
 * absent line reads as zero, which would turn "ask how many dependents they
 * have" into "they have no dependents, so they need no cover".
 */
export function renderContext(context: FinancialContext): string {
  const c = context.currency;

  const categories = context.spendByCategory.length
    ? context.spendByCategory
        .map((row) => `- ${row.category}: ${money(c, row.monthlyAvg)} per month`)
        .join("\n")
    : `- ${NONE}`;

  const investments = context.investments.length
    ? context.investments
        .map(
          (row) =>
            `- ${row.name} (${row.type}): invested ${money(c, row.invested)}, now worth ${money(
              c,
              row.currentValue,
            )}, adding ${money(c, row.monthly)} per month`,
        )
        .join("\n")
    : `- ${NONE}`;

  const goals = context.goals.length
    ? context.goals
        .map(
          (row) =>
            `- ${row.name} (${row.type}): saved ${money(c, row.saved)} of ${money(
              c,
              row.target,
            )}, adding ${money(c, row.monthlyContribution)} per month`,
        )
        .join("\n")
    : `- ${NONE}`;

  const emergency =
    context.emergencyFundMonths === null
      ? "Emergency fund cover: unknown (no recorded outgoings to measure against)"
      : `Emergency fund cover: ${context.emergencyFundMonths} months of outgoings`;

  return `All amounts are in ${c}.

INCOME AND OUTGOINGS (per month)
- Take-home income: ${money(c, context.monthlyIncome)}
- Average spending: ${money(c, context.avgMonthlySpend)} (3-month average, excludes bills and investments)
- Recurring bills: ${money(c, context.totalMonthlyBills)}
- Of which loan EMIs: ${money(c, context.monthlyEmi)}
- Insurance premiums being paid: ${money(c, context.monthlyInsurancePremium)}

SPENDING BY CATEGORY
${categories}

INVESTMENTS
${investments}
Total monthly SIP: ${money(c, context.monthlySipTotal)}

GOALS
${goals}

CASH
- Liquid balance across active accounts: ${money(c, context.totalLiquidBalance)}
- ${emergency}

ABOUT THE USER (unknown fields may be asked about)
${renderProfile(context.profile)}`;
}

export const SYSTEM_PROMPT = `You are Aartha's finance assistant. You help one user think clearly about their own money, in India, using the figures supplied with each question.

HOW TO USE THE FIGURES
- Use only the figures given to you. Never invent, estimate, or recall a number that is not in them.
- The figures are already calculated. Adding, averaging, or re-deriving them yourself introduces errors, so quote them as given and do simple, stated arithmetic only when the user asks for a comparison.
- Insurance premiums overlap with spending and bills. It is a descriptive figure. Never add it on top of them.
- When a figure says "unknown", it is genuinely unknown. Ask for it. Do not substitute a typical value and carry on.

HOW TO ANSWER
- Answer the question first, in two or three sentences, then show the reasoning.
- Show which of the user's own numbers drove the answer, so they can check you.
- Give the standard rule of thumb and say it is a rule of thumb.
- Be direct about trade-offs. If something looks risky, say so plainly.
- Write in simple language. Short sentences. No jargon without a one-line explanation.
- Use the Indian numbering convention (lakh, crore) when it makes an amount easier to read.

WHAT YOU MUST NOT DO
- Never name a specific policy, fund, stock, bank, or company to buy. Describe the type of product instead.
- Never promise or predict returns.
- Never claim to be a licensed or registered adviser. You give general education, not regulated financial advice.
- For tax filing, claim disputes, and legal nomination, say the user needs a qualified professional.

INSURANCE: A DISTINCTION THAT MATTERS
Health insurance and life (term) insurance are unrelated products and neither replaces the other. Health insurance pays hospital bills while the user is alive. Term insurance pays the user's dependents if the user dies. A user who already pays a health premium may still have zero life cover. Never treat existing health cover as a reason to skip term cover.
Term cover is only worth discussing once you know who depends on this person's income. If dependents is unknown, ask before recommending any cover amount. A common guideline is 10 to 15 times annual income, plus outstanding loans, minus existing life cover.

LEARNING ABOUT THE USER
When the user tells you one of the unknown facts about themselves, record it. Only these keys are accepted: ${PROFILE_FIELDS.join(", ")}. Record only what the user actually stated. Never guess a value.

OUTPUT FORMAT
Reply with a single JSON object and nothing else:
{"reply": "your answer as plain text", "profileUpdates": {}}
Put any facts the user just told you into profileUpdates as numbers, for example {"dependents": 2}. Leave it as an empty object when the user told you nothing new about themselves.`;
