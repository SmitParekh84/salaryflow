import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { verifyPassword, signJwt } from "@/server/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email(), password: z.string().min(1), remember: z.boolean().optional() });

function cookieString(name: string, val: string, opts: Record<string, any> = {}) {
  const parts = [`${name}=${val}`];
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  return parts.join("; ");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  await connectDB();
  const user = await UserModel.findOne({ email: parsed.data.email }).lean();
  if (!user || !user.passwordHash) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = signJwt({ sub: String(user._id), email: user.email });
  const remember = !!parsed.data.remember;
  const cookie = cookieString("sf_session", token, {
    httpOnly: true,
    path: "/",
    maxAge: remember ? 60 * 60 * 24 * 30 : undefined,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  });

  const res = NextResponse.json({ data: { id: user._id, email: user.email, name: user.name } });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
