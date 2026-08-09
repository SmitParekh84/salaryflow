import { connectDB } from "@/server/db";
import { RateLimitModel } from "@/server/models";
import { createHash } from "node:crypto";

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

function rateLimitKey(scope: string, identifier: string) {
  return createHash("sha256").update(`${scope}:${identifier.trim().toLowerCase()}`).digest("hex");
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  await connectDB();
  const key = rateLimitKey(scope, identifier);
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);

  const record = await RateLimitModel.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          key,
          count: {
            $cond: [{ $gt: ["$resetAt", now] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1],
          },
          resetAt: { $cond: [{ $gt: ["$resetAt", now] }, "$resetAt", nextReset] },
          updatedAt: now,
          createdAt: { $ifNull: ["$createdAt", now] },
        },
      },
    ],
    { upsert: true, returnDocument: "after", updatePipeline: true },
  ).lean();

  const count = Number(record?.count ?? limit + 1);
  const resetAt = new Date(record?.resetAt ?? nextReset).getTime();

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

export async function clearRateLimit(scope: string, identifier: string) {
  await connectDB();
  await RateLimitModel.deleteOne({ key: rateLimitKey(scope, identifier) });
}
