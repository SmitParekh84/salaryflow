import { getAuthenticatedContext, isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { ageOn } from "@/lib/date-of-birth";
import { financialProfileSchema } from "@/lib/schemas";
import { connectDB } from "@/server/db";
import { FinancialProfileModel } from "@/server/models";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Numeric fields the form both reads and writes. */
const NUMBER_FIELDS = [
  "dependents",
  "existingLifeCover",
  "existingHealthCover",
  "outstandingLoans",
  "spouseIncome",
] as const;

/**
 * `age` is sent back derived and read-only — the form never posts it. Legacy
 * records that carry a typed age and no birthday keep showing it until the
 * user records a birthday, at which point the birthday wins.
 */
function toResponse(doc: Record<string, unknown> | null) {
  const dateOfBirth = typeof doc?.dateOfBirth === "string" ? doc.dateOfBirth : null;
  const storedAge = typeof doc?.age === "number" ? doc.age : null;

  return {
    dateOfBirth,
    age: ageOn(dateOfBirth, new Date()) ?? storedAge,
    ...Object.fromEntries(
      NUMBER_FIELDS.map((field) => [field, typeof doc?.[field] === "number" ? doc[field] : null]),
    ),
  };
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
  const parsed = financialProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const set: Record<string, string | number> = {};
  const unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === null) unset[key] = "";
    else if (value !== undefined) set[key] = value;
  }

  // A recorded birthday makes any age typed in an earlier version dead weight,
  // and leaving it would keep the stale number alive in exports and backups.
  if (typeof set.dateOfBirth === "string") unset.age = "";

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
