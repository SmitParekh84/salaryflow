import { describe, expect, it } from "vitest";
import { parseAssistantReply } from "./reply";

describe("parseAssistantReply", () => {
  it("reads the reply and profile updates from a clean envelope", () => {
    const result = parseAssistantReply('{"reply":"You need term cover.","profileUpdates":{"dependents":2}}');

    expect(result.reply).toBe("You need term cover.");
    expect(result.profileUpdates).toEqual({ dependents: 2 });
  });

  it("treats unparseable output as a plain text reply", () => {
    // Better a bare answer than an error page; the advice is still useful.
    const result = parseAssistantReply("You should compare term plans.");

    expect(result.reply).toBe("You should compare term plans.");
    expect(result.profileUpdates).toEqual({});
  });

  it("unwraps a fenced code block", () => {
    const result = parseAssistantReply('```json\n{"reply":"Hello","profileUpdates":{}}\n```');

    expect(result.reply).toBe("Hello");
  });

  it("drops keys outside the profile whitelist", () => {
    // A model inventing `isAdmin` must never reach a database write.
    const result = parseAssistantReply(
      '{"reply":"ok","profileUpdates":{"dependents":2,"isAdmin":true,"userId":"someone-else"}}',
    );

    expect(result.profileUpdates).toEqual({ dependents: 2 });
  });

  it("drops non-numeric and nonsensical values", () => {
    const result = parseAssistantReply(
      '{"reply":"ok","profileUpdates":{"age":"twenty","dependents":-1,"spouseIncome":null}}',
    );

    expect(result.profileUpdates).toEqual({});
  });

  it("rejects an implausible age rather than storing it", () => {
    const result = parseAssistantReply('{"reply":"ok","profileUpdates":{"age":250}}');

    expect(result.profileUpdates).toEqual({});
  });

  it("keeps a zero, which is a real answer", () => {
    // "I have no dependents" is information, not an empty value.
    const result = parseAssistantReply('{"reply":"ok","profileUpdates":{"dependents":0}}');

    expect(result.profileUpdates).toEqual({ dependents: 0 });
  });

  it("never shows an envelope it could not read", () => {
    // Was asserted the other way round: the raw envelope was handed straight to
    // the user. Since the model is called with responseMimeType application/json
    // its raw output is *always* JSON, so "show the raw text" could only ever
    // put braces and quotes in front of someone asking about their money.
    const result = parseAssistantReply('{"profileUpdates":{"dependents":2}}');

    expect(result.reply).not.toContain("profileUpdates");
    expect(result.reply).not.toMatch(/^\s*[{[]/);
    expect(result.profileUpdates).toEqual({});
  });

  it("salvages the prose from an answer truncated mid-string", () => {
    // The real failure from production: gemini-2.5-flash spent its token budget
    // thinking and the envelope was cut off with no closing quote or brace. The
    // sentence it managed to write is still worth showing.
    const truncated =
      '{ "reply": "Buying a bike priced at 1.80 lakh right now would be challenging given your current financial situation. Your liquid balance of 30,753 INR is primarily';

    const result = parseAssistantReply(truncated);

    expect(result.reply).toBe(
      "Buying a bike priced at 1.80 lakh right now would be challenging given your current financial situation. Your liquid balance of 30,753 INR is primarily",
    );
    expect(result.profileUpdates).toEqual({});
  });

  it("unescapes a salvaged fragment rather than showing its escapes", () => {
    const result = parseAssistantReply('{"reply":"Line one.\\nA \\"quoted\\" word and 50\\u0025 of it');

    expect(result.reply).toBe('Line one.\nA "quoted" word and 50% of it');
  });

  it("falls back to the friendly message when an envelope has nothing to salvage", () => {
    const result = parseAssistantReply('{"profileUpdates":{"dep');

    expect(result.reply).not.toContain("profileUpdates");
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("never returns an empty reply", () => {
    expect(parseAssistantReply("   ").reply.length).toBeGreaterThan(0);
    expect(parseAssistantReply('{"reply":"","profileUpdates":{}}').reply.length).toBeGreaterThan(0);
  });
});
