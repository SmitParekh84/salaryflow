import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 422 });
  }

  try {
    await connectDB();
    const email = parsed.data.email.toLowerCase();
    const exists = await UserModel.exists({ email });

    return NextResponse.json({ data: { exists: Boolean(exists) } });
  } catch (error) {
    console.error("Email status check failed", error);
    return NextResponse.json(
      {
        error:
          "Account service is unavailable. You can finish setup on this device and connect an account later.",
      },
      { status: 503 },
    );
  }
}
