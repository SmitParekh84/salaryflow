import { isJsonRequest, isSameOriginRequest } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/server-auth";
import { connectDB } from "@/server/db";
import { sendApprovalEmail, sendRejectionEmail } from "@/server/mail";
import { AdminAuditModel, UserModel } from "@/server/models";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Approve or reject a pending account.
 *
 * A route of its own rather than another branch of `PUT /api/admin/users/[id]`.
 * That handler's body is `{ isAdmin: boolean }` and its guards are all about not
 * removing the last admin — a different decision with different invariants.
 * Folding a second verb into it would mean a discriminated union and two sets of
 * unrelated guards in one function.
 */
const schema = z.object({ decision: z.enum(["approve", "reject"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Guard order mirrors the PUT handler beside this one: identity, then origin,
  // then content type, then the id, then the body.
  const requester = await getCurrentUser();
  if (!requester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requester.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isJsonRequest(req))
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });

  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 422 });

  await connectDB();
  const target = await UserModel.findById(id).select("email name approvalStatus").lean();
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const approving = parsed.data.decision === "approve";

  /*
   * Rejecting bumps `sessionVersion`, and this is what makes a rejection real.
   *
   * `getCurrentUser` compares the token's `sv` claim against the stored value,
   * so incrementing it invalidates every session this user already holds.
   * Without it, someone approved, signed in, and then rejected keeps full access
   * until their cookie happens to expire — the login gate alone only stops the
   * *next* sign-in.
   *
   * Approving deliberately does not bump it. There is no session to revoke (a
   * pending account was never issued one) and bumping would sign out an admin
   * who is re-approving someone they rejected by mistake.
   */
  const updated = await UserModel.findByIdAndUpdate(
    id,
    {
      $set: {
        approvalStatus: approving ? "approved" : "rejected",
        approvalDecidedAt: new Date(),
        approvalDecidedBy: String(requester._id),
      },
      ...(approving ? {} : { $inc: { sessionVersion: 1 } }),
    },
    { new: true },
  )
    .select("email name approvalStatus approvalDecidedAt")
    .lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await AdminAuditModel.create({
    adminId: String(requester._id),
    targetUserId: id,
    action: parsed.data.decision,
  });

  /*
   * The decision is already committed, so a mail failure is reported rather than
   * thrown. Rolling the decision back because an email bounced would be worse:
   * the operator would see the row flip back with no explanation, and pressing
   * the button again would hit the same provider. `emailSent` lets the console
   * say "approved, but the email did not go out" — which is actionable.
   */
  const mail = approving
    ? await sendApprovalEmail({ to: updated.email, name: updated.name ?? null })
    : await sendRejectionEmail({ to: updated.email, name: updated.name ?? null });

  return NextResponse.json({
    data: {
      id: String(updated._id),
      approvalStatus: updated.approvalStatus,
      approvalDecidedAt: updated.approvalDecidedAt ?? null,
      emailSent: mail.sent,
    },
  });
}
