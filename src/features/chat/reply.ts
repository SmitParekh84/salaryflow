import type { FinancialProfile } from "./context";
import { PROFILE_FIELDS } from "./prompt";

export type ParsedReply = {
  reply: string;
  profileUpdates: Partial<Record<(typeof PROFILE_FIELDS)[number], number>>;
};

const FALLBACK_REPLY = "I could not put an answer together. Please ask again.";

/** Upper bounds that catch a hallucinated value before it reaches the database. */
const LIMITS: Record<(typeof PROFILE_FIELDS)[number], number> = {
  age: 120,
  dependents: 20,
  existingLifeCover: 1_000_000_000,
  existingHealthCover: 1_000_000_000,
  outstandingLoans: 1_000_000_000,
  spouseIncome: 100_000_000,
};

function stripFence(raw: string) {
  const fenced = raw.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : raw.trim();
}

/**
 * Turn raw model output into a reply and a set of safe profile updates.
 *
 * The model is asked for JSON but is not guaranteed to give it. Malformed
 * output degrades to plain text rather than an error, because a usable answer
 * with no profile update beats no answer at all.
 */
export function parseAssistantReply(raw: string): ParsedReply {
  const text = stripFence(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { reply: text || FALLBACK_REPLY, profileUpdates: {} };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { reply: text || FALLBACK_REPLY, profileUpdates: {} };
  }

  const record = parsed as Record<string, unknown>;
  const reply = typeof record.reply === "string" ? record.reply.trim() : "";
  // No usable reply field: show the raw output rather than swallow it, but
  // discard any updates since the envelope clearly is not what we asked for.
  if (!reply) return { reply: text || FALLBACK_REPLY, profileUpdates: {} };

  return { reply, profileUpdates: sanitiseUpdates(record.profileUpdates) };
}

function sanitiseUpdates(value: unknown): ParsedReply["profileUpdates"] {
  if (typeof value !== "object" || value === null) return {};

  const source = value as Record<string, unknown>;
  const clean: ParsedReply["profileUpdates"] = {};

  for (const field of PROFILE_FIELDS) {
    const candidate = source[field];
    if (typeof candidate !== "number" || !Number.isFinite(candidate)) continue;
    // Zero is a real answer ("no dependents"), negatives never are.
    if (candidate < 0 || candidate > LIMITS[field]) continue;
    clean[field] = Math.round(candidate);
  }

  return clean;
}

export type { FinancialProfile };
