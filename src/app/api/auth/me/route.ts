import { getCurrentUser } from "@/lib/server-auth";
import {
  SESSION_TTL_SECONDS,
  sessionTokenExpiry,
  setSessionCookie,
} from "@/lib/session-cookie";
import { signJwt, verifyJwt } from "@/server/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Slides the session forward while someone keeps using the app.
 *
 * A fixed expiry signs out an active user mid-use once the clock runs out,
 * which on a phone reads as "the app logged me out again". Every visit renews
 * the cookie for the lifetime it was originally issued with, so only a genuine
 * absence that long ends the session.
 */
async function refreshSession(response: NextResponse) {
  const token = (await cookies()).get("sf_session")?.value;
  if (!token) return;

  const payload = verifyJwt(token);
  if (!payload || typeof payload !== "object") return;

  const { iat, exp, ...claims } = payload;
  if (typeof iat !== "number" || typeof exp !== "number") return;

  // The lifetime this token was minted with — a remembered login keeps its
  // longer window, and the admin console keeps its short one.
  const ttl = exp - iat;
  if (ttl <= 0) return;

  // Only renew once a quarter of the window has burned down. Otherwise every
  // page load would rewrite the cookie for no added life.
  const remaining = exp - Math.floor(Date.now() / 1000);
  if (remaining > ttl * 0.75) return;

  const maxAge = ttl || SESSION_TTL_SECONDS;
  setSessionCookie(response, signJwt(claims, sessionTokenExpiry(maxAge)), maxAge);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ data: null });

  const response = NextResponse.json({
    data: {
      id: user._id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      onboardingCompleted:
        typeof user.onboardingCompleted === "boolean" ? user.onboardingCompleted : true,
    },
  });
  await refreshSession(response);
  return response;
}
