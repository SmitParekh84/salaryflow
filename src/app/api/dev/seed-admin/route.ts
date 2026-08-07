import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { hashPassword } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await connectDB();
  const body = await req.json().catch(() => ({}));
  const email = body.email || process.env.DEV_ADMIN_EMAIL || "admin@salaryflow.app";
  const pass = body.password || process.env.DEV_ADMIN_PASSWORD || "admin123";

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    // ensure isAdmin
    await UserModel.findByIdAndUpdate(existing._id, { isAdmin: true });
    return NextResponse.json({ data: { message: "Admin ensured", email } });
  }

  const passwordHash = await hashPassword(pass);
  const created = await UserModel.create({ email, passwordHash, name: "Admin", isAdmin: true });
  return NextResponse.json({ data: { message: "Admin created", email: created.email } }, { status: 201 });
}
