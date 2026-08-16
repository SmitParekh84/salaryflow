import { getAuthenticatedContext, isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import {
  callGemini,
  GeminiNotConfiguredError,
  GeminiUnavailableError,
  type ChatTurn,
} from "@/lib/gemini";
import { consumeRateLimit } from "@/lib/rate-limit";
import { loadFinancialContext } from "@/features/chat/load-context";
import { renderContext, SYSTEM_PROMPT } from "@/features/chat/prompt";
import { parseAssistantReply } from "@/features/chat/reply";
import { connectDB } from "@/server/db";
import { ChatMessageModel, FinancialProfileModel } from "@/server/models";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turns of history replayed to the model. Twelve keeps context without cost. */
const HISTORY_TURNS = 12;

const askSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export async function GET() {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const messages = await ChatMessageModel.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      data: messages.reverse().map((item) => ({
        role: item.role,
        text: item.text,
        at: item.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unable to load conversation" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A message of up to 2000 characters is required" }, { status: 422 });
  }
  const message = parsed.data.message;

  // Each question costs an LLM call against a small free-tier quota.
  const limit = await consumeRateLimit({
    scope: "chat",
    identifier: auth.userId,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You have reached the hourly question limit.", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    await connectDB();

    const [context, recent] = await Promise.all([
      loadFinancialContext(auth.userId),
      ChatMessageModel.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .limit(HISTORY_TURNS)
        .lean(),
    ]);

    const history: ChatTurn[] = recent
      .reverse()
      .map((item) => ({ role: item.role as ChatTurn["role"], text: item.text }));

    // Saved before the model runs, so a failed call still leaves the user's
    // question in their history rather than losing what they typed.
    await ChatMessageModel.create({ userId: auth.userId, role: "user", text: message });

    const { text, model } = await callGemini({
      system: SYSTEM_PROMPT,
      history,
      message: `${renderContext(context)}\n\nQUESTION\n${message}`,
    });

    const { reply, profileUpdates } = parseAssistantReply(text);

    await ChatMessageModel.create({
      userId: auth.userId,
      role: "model",
      text: reply,
      modelId: model,
    });

    const savedFacts = Object.keys(profileUpdates);
    if (savedFacts.length) {
      await FinancialProfileModel.findOneAndUpdate(
        { userId: auth.userId },
        { $set: profileUpdates, $setOnInsert: { userId: auth.userId } },
        { upsert: true },
      );
    }

    return NextResponse.json({ data: { reply, savedFacts } });
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      console.error("[chat] GEMINI_API_KEY is missing");
      return NextResponse.json({ error: "The assistant is not configured yet." }, { status: 503 });
    }
    if (error instanceof GeminiUnavailableError) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a minute." },
        { status: 502 },
      );
    }
    console.error("[chat] failed", error);
    return NextResponse.json({ error: "Unable to answer right now" }, { status: 500 });
  }
}
