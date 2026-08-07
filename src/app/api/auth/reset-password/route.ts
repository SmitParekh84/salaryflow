import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { OtpModel, UserModel } from "@/server/models";
import { hashPassword, signJwt } from "@/server/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email(), otp: z.string().length(6), password: z.string().min(6) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  await connectDB();
  const otpRow = await OtpModel.findOne({ email: parsed.data.email, code: parsed.data.otp, used: false }).sort({ createdAt: -1 }).lean();
  if (!otpRow) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  if (new Date(otpRow.expiresAt) < new Date()) return NextResponse.json({ error: "OTP expired" }, { status: 400 });

  // mark used
  await OtpModel.updateOne({ _id: otpRow._id }, { used: true }).catch(() => null);

  const user = await UserModel.findOne({ email: parsed.data.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const passwordHash = await hashPassword(parsed.data.password);
  user.passwordHash = passwordHash;
  await user.save().catch(() => null);

  // sign in after reset
  const token = signJwt({ sub: String(user._id), email: user.email });
  const cookie = `sf_session=${token}; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Path=/; SameSite=Lax`;
  const res = NextResponse.json({ data: { id: user._id, email: user.email, name: user.name } });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
