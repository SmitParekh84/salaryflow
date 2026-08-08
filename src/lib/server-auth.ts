import { verifyJwt } from "@/server/auth";
import { connectDB } from "@/server/db";
import { UserModel, type UserDoc } from "@/server/models";
import { cookies } from "next/headers";

export async function getCurrentUser(): Promise<UserDoc | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sf_session")?.value;
    if (!token) return null;
    const payload = verifyJwt(token);
    if (!payload || typeof payload !== "object" || !("sub" in payload) || !payload.sub) return null;
    await connectDB();
    const user = await UserModel.findById(payload.sub).lean();
    return user as UserDoc | null;
  } catch {
    return null;
  }
}
