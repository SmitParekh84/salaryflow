import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  return NextResponse.json({ error: "Account lookup is not available" }, { status: 410 });
}
