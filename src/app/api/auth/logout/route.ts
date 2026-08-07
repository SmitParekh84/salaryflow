import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // set cookie to expired
  const cookie = `sf_session=deleted; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  const res = NextResponse.json({ data: null });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
