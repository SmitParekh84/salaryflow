import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import { connectDB } from "@/server/db";
import {
  AccountTransferModel,
  BankAccountModel,
  BillModel,
  BudgetRuleModel,
  CreditCardModel,
  ExpenseModel,
  GoalModel,
  IncomeModel,
  InvestmentModel,
  RecycleBinModel,
  SalaryProfileModel,
  UserModel,
} from "@/server/models";
import { mergeCollection, type SyncModel } from "@/server/sync-merge";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Two-device sync.
 *
 * This used to delete every row for the account and re-insert the pushing
 * device's local copy. That is last-writer-wins at the *account* level: a phone
 * that had not pulled recently would silently destroy anything the other phone
 * had added since. It is replaced here by a per-item merge.
 *
 * The rule that makes it safe is `since`: the client sends the timestamp of the
 * state it is pushing from. A server row absent from that push is only removed
 * if the client had already seen it (`updatedAt <= since`). A row written by
 * another device *after* this client last pulled is newer than `since`, so it
 * survives — which is exactly the case that used to lose data.
 */

/** Collections the client mirrors, in `body` key order. */
const COLLECTIONS: { key: string; model: SyncModel }[] = [
  { key: "expenses", model: ExpenseModel },
  { key: "incomes", model: IncomeModel },
  { key: "bills", model: BillModel },
  { key: "goals", model: GoalModel },
  { key: "investments", model: InvestmentModel },
  { key: "accounts", model: BankAccountModel },
  { key: "accountTransfers", model: AccountTransferModel },
  { key: "creditCards", model: CreditCardModel },
  { key: "budgetRules", model: BudgetRuleModel },
  { key: "recycleBin", model: RecycleBinModel },
];

/** Fields the client must never dictate. */
const RESERVED = ["_id", "id", "userId", "clientId", "removedAt", "createdAt", "updatedAt"];

async function getServerState(userId: string) {
  const live = { userId, removedAt: null };

  const [profile, ...lists] = await Promise.all([
    SalaryProfileModel.findOne({ userId }).lean(),
    ...COLLECTIONS.map((c) => c.model.find(live).lean()),
  ]);

  const state: Record<string, unknown> = { profile };
  COLLECTIONS.forEach((c, index) => {
    state[c.key] = lists[index];
  });
  return state;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const userId = user.email || String(user._id);
  return NextResponse.json({ data: await getServerState(userId), syncedAt: new Date().toISOString() });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid sync payload" }, { status: 422 });

  await connectDB();
  const userId = user.email || String(user._id);

  // Absent or unparseable `since` means "this client has seen nothing", so no
  // row is ever tombstoned. Additive-only is the safe reading of an unknown
  // client state — the old code assumed the opposite and deleted everything.
  const since = body.since ? new Date(body.since) : null;
  const seenCutoff = since && !Number.isNaN(since.getTime()) ? since : null;
  const now = new Date();

  if (body.onboardingCompleted === true) {
    await UserModel.updateOne({ _id: user._id }, { onboardingCompleted: true });
  }

  if (body.profile) {
    const profile = { ...body.profile };
    for (const field of RESERVED) delete profile[field];
    await SalaryProfileModel.findOneAndUpdate(
      { userId },
      { ...profile, userId },
      { upsert: true, new: true },
    );
  }

  for (const { key, model } of COLLECTIONS) {
    // A key the client omitted is "no opinion", not "delete everything".
    if (!Array.isArray(body[key])) continue;

    const result = await mergeCollection({
      model,
      userId,
      items: body[key],
      since: seenCutoff,
      now,
    });

    if (!result.ok) {
      console.error(`[SYNC] ${key}: ${result.rejected} row(s) rejected`, {
        userId,
        reason: result.reason,
      });
      return NextResponse.json(
        { error: `Some ${key} could not be saved. Nothing was deleted.` },
        { status: 409 },
      );
    }
  }

  return NextResponse.json({
    data: await getServerState(userId),
    syncedAt: now.toISOString(),
  });
}
