import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { ExpenseModel, BillModel, GoalModel, InvestmentModel, SalaryProfileModel, UserModel } from "@/server/models";
import { verifyJwt } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/sf_session=([^;]+)/);
  const token = match ? match[1] : null;
  const body = await req.json().catch(() => null);
  if (!token || !body) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = verifyJwt(token) as any;
  if (!payload?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await UserModel.findById(payload.sub).lean();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.email || String(user._id);

  // upsert profile
  if (body.profile) {
    await SalaryProfileModel.findOneAndUpdate({ userId }, { ...body.profile, userId }, { upsert: true, new: true });
  }

  // replace collections for user
  const collections = [
    { model: ExpenseModel, items: body.expenses || [] },
    { model: BillModel, items: body.bills || [] },
    { model: GoalModel, items: body.goals || [] },
    { model: InvestmentModel, items: body.investments || [] },
  ];

  for (const entry of collections) {
    await entry.model.deleteMany({ userId });
    if (Array.isArray(entry.items) && entry.items.length > 0) {
      const docs = entry.items.map((it: any) => {
        const copy = { ...it };
        delete copy.id;
        delete copy._id;
        copy.userId = userId;
        return copy;
      });
      await entry.model.insertMany(docs, { ordered: false }).catch(() => null);
    }
  }

  // return merged server state
  const [profile, expenses, bills, goals, investments] = await Promise.all([
    SalaryProfileModel.findOne({ userId }).lean(),
    ExpenseModel.find({ userId }).lean(),
    BillModel.find({ userId }).lean(),
    GoalModel.find({ userId }).lean(),
    InvestmentModel.find({ userId }).lean(),
  ]);

  return NextResponse.json({ data: { profile, expenses, bills, goals, investments } });
}
