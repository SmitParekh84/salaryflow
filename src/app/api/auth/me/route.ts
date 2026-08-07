import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { verifyJwt } from "@/server/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sf_session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return NextResponse.json({ data: null });
  const payload = verifyJwt(token) as any;
  if (!payload || !payload.sub) return NextResponse.json({ data: null });

  await connectDB();
  const user = await UserModel.findById(payload.sub).lean();
  if (!user) return NextResponse.json({ data: null });
  return NextResponse.json({ data: { id: user._id, email: user.email, name: user.name } });
}
