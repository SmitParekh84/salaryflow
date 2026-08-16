# Finance Assistant — Design

Date: 2026-08-16
Status: Approved

## Purpose

Let a user ask personal-finance questions in plain language ("should I take
term insurance?", "can I afford a bike EMI?", "am I saving enough?") and get an
answer grounded in their own Aartha data instead of generic advice.

## Non-goals

- The assistant does not change financial records. It cannot add bills, log
  expenses, create goals, or move money. The only thing it writes is the
  user's own financial profile, and only from facts the user typed.
- It does not recommend named products ("buy HDFC Click 2 Protect"). It gives
  reasoning, the standard guideline, and the user's own numbers.
- No streaming in v1. See "Deferred".

## Core principle: code computes, the model explains

The model never does arithmetic that the answer depends on. `computeSummary()`
in `src/lib/calculations.ts` already derives the household numbers, and a new
context builder turns them into a compact snapshot. The model receives finished
figures and is instructed to use only those.

This follows two existing product rules in `PRODUCT.md`: "Never invent or
silently infer completed financial transactions" and the anti-reference against
"hidden financial assumptions". A model that adds up expense rows itself would
violate both, silently.

## Architecture

```
POST /api/chat
  -> getAuthenticatedContext()          existing, 401 when absent
  -> isSameOriginRequest / isJsonRequest existing guards
  -> consumeRateLimit(scope "chat")      existing, 30 msgs/hour per user
  -> buildFinancialContext(userId)       new, server-side only
  -> loadRecentTurns(userId, 12)         new
  -> callGemini(systemPrompt, context, history, message)
  -> persist turn + any profile updates
  -> { reply, savedFacts }
```

The snapshot is derived server-side from the authenticated `userId`. No client
input selects whose data is read, so a user cannot reach another user's
finances by tampering with the request body.

### Modules

| Module | Path | Responsibility |
|---|---|---|
| Context builder | `src/features/chat/context.ts` | Financial docs -> `FinancialContext` snapshot. Pure function over already-fetched data, so it is unit-testable without Mongo. |
| Context loader | `src/features/chat/load-context.ts` | Mongo reads for one user, then calls the builder. |
| System prompt | `src/features/chat/prompt.ts` | Advisor persona, safety rules, snapshot rendering. |
| Gemini client | `src/lib/gemini.ts` | Thin wrapper over `@google/genai`. Single place that knows the model id and key. |
| Chat route | `src/app/api/chat/route.ts` | Orchestrates the flow above. |
| Profile route | `src/app/api/profile/financial/route.ts` | GET/PUT for the Settings form. |
| Models | `src/server/models.ts` | `FinancialProfileSchema`, `ChatMessageSchema`. |
| UI | `src/features/chat/*`, `src/app/(app)/assistant/page.tsx` | Chat page. |

### `FinancialContext` shape

```ts
type FinancialContext = {
  currency: string;
  monthlyIncome: number;
  avgMonthlySpend: number;
  spendByCategory: { category: string; monthlyAvg: number }[];
  totalMonthlyBills: number;
  monthlyEmi: number;
  monthlyInsurancePremium: number;   // from the "Insurance" category
  investments: { type: string; invested: number; currentValue: number; monthly: number }[];
  monthlySipTotal: number;
  goals: { name: string; type: string; target: number; saved: number; monthlyContribution: number }[];
  totalLiquidBalance: number;
  emergencyFundMonths: number | null; // null when avgMonthlySpend is 0
  profile: FinancialProfile;          // may have nulls; that is the signal to ask
};
```

Every number is rounded to whole rupees before it reaches the model. Category
spend uses a trailing 3-month average so a single large month does not skew the
picture.

## Financial profile

Aartha stores no age, dependents, existing life cover, or loan balances — and
those are exactly what a term-insurance answer needs. New collection:

```ts
FinancialProfileSchema {
  userId: string (indexed, unique)
  age?: number
  dependents?: number
  existingLifeCover?: number
  existingHealthCover?: number
  outstandingLoans?: number
  spouseIncome?: number
  updatedAt: Date
}
```

Filled two ways, into the same record:

1. **Settings form.** An "About you" card in Settings. Every field optional.
2. **Conversationally.** When the snapshot shows a field is null and the
   question needs it, the model asks. The user's answer is extracted and saved.

Extraction is explicit, not inferred. The model returns:

```json
{ "reply": "...", "profileUpdates": { "dependents": 2 } }
```

Only keys in the whitelist above are accepted, each validated by zod, and the
UI shows a "Saved: 2 dependents" chip under the reply. No silent writes.

## Safety

The system prompt fixes the assistant as **educational, not licensed advice**:

- Never name a specific policy, fund, or company to buy.
- Never promise returns.
- Always show which of the user's numbers drove the answer.
- When a required fact is missing, ask for it rather than assuming.
- Say plainly when something needs a human professional (tax filing, claims,
  legal nomination).

A persistent disclaimer sits below the chat input.

### Health cover is not life cover

The motivating question — "I pay ₹825/month to HDFC Ergo for health cover, do I
also need term insurance?" — has a trap. Health insurance reimburses hospital
bills while the user is alive; term insurance pays dependents if the user dies.
Neither substitutes for the other. The prompt states this distinction
explicitly so the assistant does not treat existing health cover as a reason to
skip term cover, and steers it to ask about dependents first.

## Error handling

| Failure | Behaviour |
|---|---|
| No session | 401, chat page redirects to login |
| Rate limit hit | 429 with `retryAfterSeconds`, UI shows a wait message |
| Missing `GEMINI_API_KEY` | 503 and a clear server log; never a blank reply |
| Gemini timeout / 5xx | One retry, then 502 and "I could not reach the assistant. Try again." The user's message is still saved so nothing is lost. |
| Model returns unparseable JSON | Fall back to treating the whole output as the reply text, discard `profileUpdates`. A malformed profile update must never corrupt the record. |

## Testing

Pure logic gets real tests; the model does not.

- `src/features/chat/context.test.ts` — the context builder against fixture
  data. Covers: category averaging, EMI and insurance extraction, emergency
  fund months, zero-spend division guard, empty account list.
- `src/features/chat/prompt.test.ts` — the snapshot renders every field, and
  null profile fields are marked "unknown" rather than omitted (an omitted
  field reads to the model as zero).
- `src/app/api/chat/route.test.ts` — with the Gemini client mocked: 401 without
  auth, 429 past the limit, profile updates outside the whitelist rejected,
  malformed model JSON degrades to plain text.

No test asserts on model wording. Existing suite is vitest (`pnpm test`).

## Deferred

- **Streaming replies.** Conflicts with extracting the trailing profile-update
  JSON in one call. Revisit by streaming text and doing extraction in a second
  cheap call.
- **Actions with confirmation.** "Shall I create a term-cover goal?" needs tool
  calling plus a confirm UI.
- **App navigation help.** "How do I add a bill?" needs a separate knowledge
  base of Aartha's screens.
