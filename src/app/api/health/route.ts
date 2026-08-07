import { connectDB } from "@/server/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({
      status: "ok",
      db: "connected",
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "disconnected",
        error: err instanceof Error ? err.message : "unknown error",
      },
      { status: 503 }
    );
  }
}
