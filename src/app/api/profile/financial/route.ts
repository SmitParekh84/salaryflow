import { getAuthenticatedContext, isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { connectDB } from "@/server/db";
import { FinancialProfileModel } from "@/server/models";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every field is optional and nullable. Null means "clear this", which is
 * different from omitting the key, which means "leave it as it is".
 */
const profileSchema = z.object({
  age: z.number().int().min(14).max(120).nullable().optional(),
  dependents: z.number().int().min(0).max(20).nullable().optional(),
  existingLifeCover: z.number().min(0).max(1_000_000_000).nullable().optional(),
  existingHealthCover: z.number().min(0).max(1_000_000_000).nullable().optional(),
  outstandingLoans: z.number().min(0).max(1_000_000_000).nullable().optional(),
  spouseIncome: z.number().min(0).max(100_000_000).nullable().optional(),
});

const FIELDS = [
  "age",
  "dependents",
  "existingLifeCover",
  "existingHealthCover",
  "outstandingLoans",
  "spouseIncome",
] as const;

function toResponse(doc: Record<string, unknown> | null) {
  return Object.fromEntries(
    FIELDS.map((field) => [field, typeof doc?.[field] === "number" ? doc[field] : null]),
  );
}

export async function GET() {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const doc = await FinancialProfileModel.findOne({ userId: auth.userId }).lean();
    return NextResponse.json({ data: toResponse(doc as Record<string, unknown> | null) });
  } catch {
    return NextResponse.json({ error: "Unable to load your profile" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await getAuthenticatedContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const set: Record<string, number> = {};
  const unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === null) unset[key] = "";
    else if (value !== undefined) set[key] = value;
  }

  try {
    await connectDB();
    const updated = await FinancialProfileModel.findOneAndUpdate(
      { userId: auth.userId },
      {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
        $setOnInsert: { userId: auth.userId },
      },
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({ data: toResponse(updated as Record<string, unknown> | null) });
  } catch {
    return NextResponse.json({ error: "Unable to save your profile" }, { status: 500 });
  }
}
