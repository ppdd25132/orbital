import { requireSession, parseLimitedJson, jsonError } from "@/lib/api-guard";
import {
  auditLog,
  createScheduledSend,
  getDraftForUser,
  requireApprovedTarget,
  updateDraftBodyAndStatus,
} from "@/lib/orbital-store";

export const runtime = "nodejs";

function scopeFromRow(row = {}) {
  return {
    tenant_id: row.tenant_id,
    firm_id: row.firm_id,
    practice_id: row.practice_id,
    practitioner_id: row.practitioner_id,
    entity_id: row.entity_id,
    client_id: row.client_id,
    engagement_id: row.engagement_id,
    external_scope_ref: row.external_scope_ref,
  };
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const userEmail = session.user.email;
    const { draftId, scheduledAt } = await parseLimitedJson(request);

    if (!draftId || !scheduledAt) {
      return Response.json({ error: "draftId and scheduledAt are required" }, { status: 400 });
    }

    const scheduledFor = new Date(scheduledAt);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
      return Response.json({ error: "scheduledAt must be a future ISO timestamp" }, { status: 400 });
    }

    const draft = await getDraftForUser(userEmail, draftId);
    if (!draft) {
      return Response.json({ error: "Draft not found" }, { status: 404 });
    }

    const approval = await requireApprovedTarget(userEmail, "draft_response", draftId);
    const schedule = await createScheduledSend({
      userEmail,
      draftId,
      approvalId: approval.id,
      scheduledFor: scheduledFor.toISOString(),
      scope: scopeFromRow(draft),
    });

    await updateDraftBodyAndStatus(userEmail, draftId, { status: "scheduled" });
    await auditLog({
      userEmail,
      action: "approved_email_scheduled",
      targetType: "scheduled_send",
      targetId: schedule.id,
      metadata: { draftId, approvalId: approval.id, scheduledAt: scheduledFor.toISOString() },
      scope: scopeFromRow(draft),
    }).catch(() => {});

    return Response.json({ schedule, approval });
  } catch (error) {
    return jsonError(error, "Failed to schedule approved draft");
  }
}
