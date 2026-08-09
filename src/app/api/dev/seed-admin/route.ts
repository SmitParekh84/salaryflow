import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { hashPassword } from "@/server/auth";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const seedToken = process.env.DEV_ADMIN_SEED_TOKEN;
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_DEV_ADMIN_SEED !== "true" ||
    !seedToken
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  if (req.headers.get("x-dev-seed-token") !== seedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const pass = typeof body.password === "string" ? body.password : "";
  if (!email || pass.length < 12) {
    return NextResponse.json(
      { error: "A valid email and password of at least 12 characters are required" },
      { status: 400 },
    );
  }

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    await UserModel.findByIdAndUpdate(existing._id, { isAdmin: true });
    return NextResponse.json({ data: { message: "Admin ensured", email } });
  }

  const passwordHash = await hashPassword(pass);
  const created = await UserModel.create({ email, passwordHash, name: "Admin", isAdmin: true });
  return NextResponse.json(
    { data: { message: "Admin created", email: created.email } },
    { status: 201 },
  );
}
