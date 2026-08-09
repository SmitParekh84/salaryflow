import { getCurrentUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { UserModel } from "@/server/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requester.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await connectDB();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [users, totalUsers, adminUsers, verifiedUsers, recentUsers] = await Promise.all([
      UserModel.find({})
        .select("email name isAdmin emailVerified createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      UserModel.countDocuments({}),
      UserModel.countDocuments({ isAdmin: true }),
      UserModel.countDocuments({ emailVerified: true }),
      UserModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    return NextResponse.json({
      data: {
        currentUserId: String(requester._id),
        stats: { totalUsers, adminUsers, verifiedUsers, recentUsers },
        users: users.map((user) => ({
          id: String(user._id),
          email: user.email,
          name: user.name || null,
          isAdmin: Boolean(user.isAdmin),
          emailVerified: Boolean(user.emailVerified),
          createdAt: user.createdAt,
        })),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load administration data" }, { status: 500 });
  }
}
