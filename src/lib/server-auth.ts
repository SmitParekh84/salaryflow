import { cookies } from "next/headers";
import { verifyJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { UserModel, type UserDoc } from "@/server/models";

export async function getCurrentUser(): Promise<UserDoc | null> {
  try {
    const cookieStore = (cookies() as any);
    const token = cookieStore.get?.("sf_session")?.value;
    if (!token) return null;
    const payload = verifyJwt(token) as any;
    if (!payload?.sub) return null;
    await connectDB();
    const user = await UserModel.findById(payload.sub).lean();
    return user as any;
  } catch (e) {
    return null;
  }
}
