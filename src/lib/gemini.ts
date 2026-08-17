import { GoogleGenAI } from "@google/genai";

/* ---------------------------------------------------------------------------
   Gemini access for the finance assistant.

   The free tier is tight — gemini-2.5-flash allows roughly 5 requests a minute
   and 20 a day — so a single pinned model would leave the assistant dead for
   the rest of the day after twenty questions. Models are tried in order and a
   model that reports quota exhaustion is skipped for one full rate window
   instead of being retried into the ground.
   --------------------------------------------------------------------------- */

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite-preview",
] as const;

const COOLDOWN_MS = 65_000;

/*
 * Room for the answer, and a ceiling on the thinking that competes with it.
 *
 * On a 2.5 model the token cap covers reasoning *and* output from one pot. A
 * measured run of a routine "can I afford this?" question spent 933 tokens
 * thinking and 320 answering — 1253 against the 1400 cap this used to set. The
 * ~10% of headroom left is why the assistant only failed sometimes: a slightly
 * longer thought crossed the line and the reply was cut off mid-sentence, in
 * the middle of a JSON string, leaving the user looking at `{ "reply": "Buying
 * a bike priced at 1.80 lakh...` with no end to it.
 *
 * Capping thinking is the fix that matters; raising the total is the belt to
 * its braces. Together the answer has roughly six times the room it needs.
 */
const THINKING_BUDGET = 640;
const MAX_OUTPUT_TOKENS = 2600;

/**
 * `thinkingBudget` is a 2.5-series control. Gemini 3 models take `thinkingLevel`
 * instead and can reject the older field outright, and a rejected config throws
 * as a non-quota error — which aborts the whole fallback chain. Only the models
 * known to accept it are sent it.
 */
function thinkingConfigFor(model: string) {
  return model.startsWith("gemini-2.5") ? { thinkingBudget: THINKING_BUDGET } : undefined;
}

/** modelId -> epoch ms until which the model is considered exhausted. */
const cooldownUntil = new Map<string, number>();

export class GeminiUnavailableError extends Error {}
export class GeminiNotConfiguredError extends Error {}

export type ChatTurn = { role: "user" | "model"; text: string };

function isQuotaError(error: unknown) {
  const status = (error as { status?: number })?.status;
  if (status === 429 || status === 503) return true;
  const message = String((error as Error)?.message ?? "").toLowerCase();
  return message.includes("quota") || message.includes("rate limit") || message.includes("overloaded");
}

/**
 * Ask Gemini, falling through the model list on quota errors.
 *
 * Returns the raw text. Parsing the JSON envelope is the caller's job, because
 * only the caller knows what to do with a malformed one.
 */
export async function callGemini({
  system,
  history,
  message,
}: {
  system: string;
  history: ChatTurn[];
  message: string;
}): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiNotConfiguredError("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: "user" as const, parts: [{ text: message }] },
  ];

  const now = Date.now();
  const available = MODELS.filter((model) => (cooldownUntil.get(model) ?? 0) <= now);
  // Every model is cooling down: try them all anyway rather than fail outright,
  // since a cooldown is a guess about quota, not a fact.
  const candidates = available.length ? available : MODELS;

  let lastError: unknown;
  // A reply the model ran out of room to finish. Worth keeping: the prose it
  // did write still answers the question, and the caller can read it out of the
  // half-written envelope. Only used if no model manages a complete answer.
  let truncated: { text: string; model: string } | null = null;

  for (const model of candidates) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          temperature: 0.4,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          thinkingConfig: thinkingConfigFor(model),
        },
      });

      const text = response.text?.trim();
      const finishReason = response.candidates?.[0]?.finishReason;

      // Previously this returned on any non-empty text, so a response the model
      // was cut off mid-way through was handed back as though it were whole.
      // Another model may well have the room to finish the same question.
      if (finishReason === "MAX_TOKENS") {
        if (text && !truncated) truncated = { text, model };
        lastError = new Error(`${model} ran out of output tokens`);
        continue;
      }

      if (text) return { text, model };
      lastError = new Error(`${model} returned an empty response`);
    } catch (error) {
      lastError = error;
      if (isQuotaError(error)) {
        cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
        continue;
      }
      // A non-quota failure (bad key, malformed request) will fail identically
      // on every other model, so stop rather than burn the whole chain.
      throw error;
    }
  }

  // Half an answer beats "the assistant is busy", so long as the caller reads
  // the prose out of it rather than showing the envelope.
  if (truncated) return truncated;

  throw new GeminiUnavailableError(
    `All Gemini models are unavailable: ${String((lastError as Error)?.message ?? lastError)}`,
  );
}
