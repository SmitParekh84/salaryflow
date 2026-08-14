import { isSameOriginRequest } from "@/lib/api-security";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { SESSION_TTL_SECONDS, sessionTokenExpiry, setSessionCookie } from "@/lib/session-cookie";
import { signJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { DEMO_EMAIL, ensureDemoUser, reseedDemoAccount } from "@/server/demo-seed";
import { UserModel } from "@/server/models";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_RESET_MINUTES = 60;

function resetWindowMs(): number {
  const configured = Number(process.env.DEMO_RESET_MINUTES);
  const minutes =
    Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RESET_MINUTES;
  return minutes * 60 * 1000;
}

/**
 * Claims the right to re-seed, atomically.
 *
 * The demo account is shared, so two visitors can arrive while it is stale at
 * the same time. Without a claim they would both run the wipe-and-insert and
 * interleave — one request's deletes landing between the other's inserts, which
 * leaves the account half-empty. The `demoSeededAt` predicate means exactly one
 * request wins the conditional update; the losers skip straight to the cookie.
 *
 * Returns true when this request must re-seed.
 */
async function claimReseed(now: Date, cutoff: Date): Promise<boolean> {
  const claimed = await UserModel.findOneAndUpdate(
    {
      email: DEMO_EMAIL,
      $or: [{ demoSeededAt: { $lte: cutoff } }, { demoSeededAt: { $exists: false } }],
    },
    { $set: { demoSeededAt: now } },
    { new: true },
  ).lean();
  return Boolean(claimed);
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = await consumeRateLimit({
    scope: "demo-ip",
    identifier: getClientIp(request),
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demo limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  await connectDB();
  const now = new Date();

  const cutoff = new Date(now.getTime() - resetWindowMs());

  // One round trip on the hot path. `ensureDemoUser` already returns the row
  // including `demoSeededAt`, so the freshness test costs nothing extra — only
  // a demo that actually looks stale pays for the second query. That second
  // query is not redundant: this check is a plain read and two visitors can
  // both pass it, so the conditional update is what settles which one re-seeds.
  const user = await ensureDemoUser();
  const stale = !user.demoSeededAt || user.demoSeededAt <= cutoff;

  // The slow path, and only on the first visit of each window. It runs before
  // the response rather than after it: the client calls loadFromServer() the
  // moment it has the cookie, so a background wipe would race that read and
  // hand the visitor an empty dashboard.
  if (stale && (await claimReseed(now, cutoff))) await reseedDemoAccount(now);

  const token = signJwt(
    { sub: String(user._id), email: user.email, sv: Number(user.sessionVersion ?? 0) },
    sessionTokenExpiry(SESSION_TTL_SECONDS),
  );
  const response = NextResponse.json({
    data: { id: user._id, email: user.email, name: user.name, onboardingCompleted: true },
  });
  setSessionCookie(response, token);
  return response;
}
