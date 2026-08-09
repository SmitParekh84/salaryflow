import { getCurrentUser } from "@/lib/server-auth";
import type { AppNotification } from "@/lib/types";
import { NotificationModel } from "@/server/models";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const readSchema = z
  .object({
    id: z.string().optional(),
    all: z.boolean().optional(),
  })
  .refine((value) => value.all === true || Boolean(value.id), {
    message: "A notification id or all=true is required",
  });

function notificationUserId(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return user.email;
}

function serializeNotification(value: unknown): AppNotification | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const rawId = record._id ?? record.id;
  if (!rawId || typeof record.title !== "string" || typeof record.body !== "string") return null;

  const createdAt =
    record.createdAt instanceof Date ? record.createdAt : new Date(String(record.createdAt));
  const type = typeof record.type === "string" ? (record.type as AppNotification["type"]) : "info";

  return {
    id: String(rawId),
    title: record.title,
    body: record.body,
    type,
    date: Number.isNaN(createdAt.getTime()) ? new Date().toISOString() : createdAt.toISOString(),
    read: record.read === true,
    href: typeof record.href === "string" ? record.href : undefined,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await NotificationModel.find({ userId: notificationUserId(user) })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    {
      data: notifications.flatMap(
        (notification: unknown) => serializeNotification(notification) ?? [],
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = readSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid notification update" },
      { status: 400 },
    );
  }

  const userId = notificationUserId(user);
  if (parsed.data.all) {
    await NotificationModel.updateMany({ userId, read: false }, { $set: { read: true } });
  } else if (parsed.data.id && Types.ObjectId.isValid(parsed.data.id)) {
    await NotificationModel.updateOne({ _id: parsed.data.id, userId }, { $set: { read: true } });
  }

  return NextResponse.json({ data: { success: true } });
}
