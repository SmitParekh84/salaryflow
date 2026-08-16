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
  for (const model of candidates) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          temperature: 0.4,
          maxOutputTokens: 1400,
        },
      });

      const text = response.text?.trim();
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

  throw new GeminiUnavailableError(
    `All Gemini models are unavailable: ${String((lastError as Error)?.message ?? lastError)}`,
  );
}
