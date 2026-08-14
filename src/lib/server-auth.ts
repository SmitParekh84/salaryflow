import { verifyJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { UserModel, type UserDoc } from "@/server/models";
import type { Types } from "mongoose";
import { cookies } from "next/headers";

export type AuthenticatedUser = UserDoc & { _id: Types.ObjectId };

/**
 * Verifies the session cookie's signature without touching the database.
 *
 * For a page whose only job is to redirect a signed-out visitor, the full
 * `getCurrentUser` is far too expensive: it opens a Mongo connection and reads
 * the user document on every render, and the app group's layout renders on
 * navigation. The signature alone already proves the cookie was minted by this
 * server and has not expired.
 *
 * It deliberately skips the `sessionVersion` check, so a session revoked
 * elsewhere can still render the shell until the next full load. Nothing
 * leaks: the shell's data comes from the device's own cache, and every API
 * route still calls `getCurrentUser` and answers 401.
 */
export async function hasValidSessionCookie(): Promise<boolean> {
  const token = (await cookies()).get("sf_session")?.value;
  if (!token) return false;

  const payload = verifyJwt(token);
  return Boolean(payload && typeof payload === "object" && "sub" in payload && payload.sub);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sf_session")?.value;
    if (!token) return null;
    const payload = verifyJwt(token);
    if (!payload || typeof payload !== "object" || !("sub" in payload) || !payload.sub) return null;
    await connectDB();
    const user = await UserModel.findById(payload.sub).select("+sessionVersion").lean();
    if (!user || Number(payload.sv ?? 0) !== Number(user.sessionVersion ?? 0)) return null;
    return user as AuthenticatedUser | null;
  } catch {
    return null;
  }
}
