import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { callGemini } = await import("./gemini");

/** Shape of the one field of the SDK response this module reads. */
function reply({ text, finishReason = "STOP" }: { text: string; finishReason?: string }) {
  return { text, candidates: [{ finishReason }] };
}

const ask = () => callGemini({ system: "s", history: [], message: "m" });

describe("callGemini", () => {
  beforeEach(() => {
    generateContent.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("caps thinking on 2.5 models so it cannot eat the answer's budget", async () => {
    // The production failure: thinking spent 933 of the 1400-token pot and the
    // reply was cut off mid-string. The budget is what stops that recurring.
    generateContent.mockResolvedValue(reply({ text: '{"reply":"ok","profileUpdates":{}}' }));

    await ask();

    const config = generateContent.mock.calls[0][0].config;
    expect(config.thinkingConfig).toEqual({ thinkingBudget: 640 });
    expect(config.maxOutputTokens).toBeGreaterThan(1400);
  });

  it("does not send thinkingBudget to a model that would reject it", async () => {
    // Gemini 3 takes thinkingLevel; sending the 2.5 field throws a non-quota
    // error, which would abort the whole fallback chain rather than skip a model.
    generateContent
      .mockResolvedValueOnce(reply({ text: "cut", finishReason: "MAX_TOKENS" }))
      .mockResolvedValueOnce(reply({ text: "cut", finishReason: "MAX_TOKENS" }))
      .mockResolvedValueOnce(reply({ text: '{"reply":"ok","profileUpdates":{}}' }));

    const result = await ask();

    const configs = generateContent.mock.calls.map((call) => call[0]);
    const gemini3 = configs.find((c) => String(c.model).startsWith("gemini-3"));
    expect(gemini3?.config.thinkingConfig).toBeUndefined();
    expect(result.text).toContain("ok");
  });

  it("moves to the next model instead of returning a cut-off answer", async () => {
    generateContent
      .mockResolvedValueOnce(reply({ text: '{"reply":"half an ans', finishReason: "MAX_TOKENS" }))
      .mockResolvedValueOnce(reply({ text: '{"reply":"a whole answer","profileUpdates":{}}' }));

    const result = await ask();

    expect(result.text).toBe('{"reply":"a whole answer","profileUpdates":{}}');
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("returns the cut-off answer only when no model can finish one", async () => {
    // Half an answer the caller can salvage prose from beats "assistant is busy".
    generateContent.mockResolvedValue(
      reply({ text: '{"reply":"partial thought', finishReason: "MAX_TOKENS" }),
    );

    const result = await ask();

    expect(result.text).toBe('{"reply":"partial thought');
  });

  it("still reports unavailable when every model fails outright", async () => {
    generateContent.mockResolvedValue(reply({ text: "" }));

    await expect(ask()).rejects.toThrow(/unavailable/i);
  });
});
