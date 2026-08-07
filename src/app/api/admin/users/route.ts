import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { verifyJwt } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sf_session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyJwt(token) as any;
  if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const requester = await UserModel.findById(payload.sub).lean();
  if (!requester || !requester.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await UserModel.find({}, { passwordHash: 0 }).lean();
  return NextResponse.json({ data: users });
}
