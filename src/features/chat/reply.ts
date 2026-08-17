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

const ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  '"': '"',
  "\\": "\\",
  "/": "/",
};

/**
 * Pull the answer out of an envelope that never finished.
 *
 * A response cut off by the token limit stops mid-string: the prose the model
 * did write is there, just with no closing quote or brace, so `JSON.parse`
 * rejects the whole thing. The sentence is still the answer to the user's
 * question, and reading it out by hand is better than throwing it away.
 *
 * Scans the string body itself rather than matching to the next quote, because
 * an answer containing an escaped quote would otherwise be cut at that quote.
 */
function salvageReply(text: string): string {
  const opener = /"reply"\s*:\s*"/.exec(text);
  if (!opener) return "";

  let out = "";
  for (let i = opener.index + opener[0].length; i < text.length; i += 1) {
    const char = text[i];

    if (char === "\\") {
      const escaped = text[i + 1];
      if (escaped === undefined) break;
      if (escaped === "u") {
        const hex = text.slice(i + 2, i + 6);
        // A \u sequence chopped by the cut-off has nothing left to decode.
        if (!/^[0-9a-f]{4}$/i.test(hex)) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        continue;
      }
      out += ESCAPES[escaped] ?? escaped;
      i += 1;
      continue;
    }

    if (char === '"') break;
    out += char;
  }

  return out.trim();
}

/**
 * What to show when the envelope is not usable.
 *
 * The model is called with `responseMimeType: "application/json"`, so its raw
 * output is always an envelope — which is why handing the raw text back, as
 * this used to, could only ever put braces and quote marks in front of someone
 * asking about their money. Plain prose still passes through untouched: that is
 * a real answer, and it is what a model ignoring the format would produce.
 */
function recoverReply(text: string): string {
  const salvaged = salvageReply(text);
  if (salvaged) return salvaged;

  const looksLikeEnvelope = /^\s*[{[]/.test(text) || /"(?:reply|profileUpdates)"\s*:/.test(text);
  if (looksLikeEnvelope) return FALLBACK_REPLY;

  return text || FALLBACK_REPLY;
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
    return { reply: recoverReply(text), profileUpdates: {} };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { reply: recoverReply(text), profileUpdates: {} };
  }

  const record = parsed as Record<string, unknown>;
  const reply = typeof record.reply === "string" ? record.reply.trim() : "";
  // No usable reply field: recover what prose there is, and discard any
  // updates since the envelope clearly is not what we asked for.
  if (!reply) return { reply: recoverReply(text), profileUpdates: {} };

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
