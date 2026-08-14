import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import type { AppNotification } from "@/lib/types";
import { NotificationModel } from "@/server/models";
import { Types } from "mongoose";
import { createHash } from "node:crypto";
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

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await NotificationModel.find({ userId: notificationUserId(user) })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const data = notifications.flatMap(
    (notification: unknown) => serializeNotification(notification) ?? [],
  );

  // `no-cache` still revalidates on every poll, but an unchanged list now
  // answers with an empty 304 instead of resending fifty notifications. The
  // browser serves its stored copy, so the caller sees no difference.
  const etag = `W/"${createHash("sha1").update(JSON.stringify(data)).digest("base64url")}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  return NextResponse.json({ data }, { headers });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOriginRequest(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(request))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

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
