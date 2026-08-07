import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { verifyJwt } from "@/server/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ isAdmin: z.boolean() });

export async function PUT(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sf_session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyJwt(token) as any;
  if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const requester = await UserModel.findById(payload.sub).lean();
  if (!requester || !requester.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const idFromQuery = url.searchParams.get("id");
  const idFromPath = url.pathname.split("/").pop();
  const id = idFromQuery || idFromPath;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  const updated = await UserModel.findByIdAndUpdate(id, { isAdmin: parsed.data.isAdmin }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { id: updated._id, email: updated.email, name: updated.name, isAdmin: updated.isAdmin } });
}

export async function DELETE(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sf_session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyJwt(token) as any;
  if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const requester = await UserModel.findById(payload.sub).lean();
  if (!requester || !requester.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const idFromQuery = url.searchParams.get("id");
  const idFromPath = url.pathname.split("/").pop();
  const id = idFromQuery || idFromPath;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const removed = await UserModel.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { id: removed._id, email: removed.email } });
}
