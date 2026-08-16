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

  it("falls back to text when reply is missing or not a string", () => {
    const result = parseAssistantReply('{"profileUpdates":{"dependents":2}}');

    expect(result.reply).toContain("profileUpdates");
    expect(result.profileUpdates).toEqual({});
  });

  it("never returns an empty reply", () => {
    expect(parseAssistantReply("   ").reply.length).toBeGreaterThan(0);
    expect(parseAssistantReply('{"reply":"","profileUpdates":{}}').reply.length).toBeGreaterThan(0);
  });
});
