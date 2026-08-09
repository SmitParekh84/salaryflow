import { getCurrentUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ data: null });
  return NextResponse.json({
    data: {
      id: user._id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      onboardingCompleted:
        typeof user.onboardingCompleted === "boolean" ? user.onboardingCompleted : true,
    },
  });
}
