import { verifyJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { UserModel, type UserDoc } from "@/server/models";
import type { Types } from "mongoose";
import { cookies } from "next/headers";

export type AuthenticatedUser = UserDoc & { _id: Types.ObjectId };

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
