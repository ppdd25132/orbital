import { requireSession, parseLimitedJson, jsonError } from "@/lib/api-guard";
import {
  createInflectExportEvent,
  getDraftForUser,
  recordApproval,
  updateDraftBodyAndStatus,
  auditLog,
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
    const body = await parseLimitedJson(request);
    const {
      targetType,
      targetId,
      decision,
      editedPayload = null,
      notes = "",
      scope = {},
    } = body;

    let draft = null;
    if (String(targetType || "").trim().toLowerCase() === "draft_response") {
      draft = await getDraftForUser(userEmail, targetId);
      if (!draft) {
        return Response.json({ error: "Draft not found" }, { status: 404 });
      }
    }

    const approval = await recordApproval({
      userEmail,
      targetType,
      targetId,
      decision,
      editedPayload,
      notes,
      scope,
    });

    let event = null;

    if (approval.target_type === "draft_response") {
      const finalBody = editedPayload?.body || null;
      const nextStatus =
        approval.decision === "approved"
          ? "approved"
          : approval.decision === "rejected"
            ? "rejected"
            : "draft";

      draft = await updateDraftBodyAndStatus(userEmail, draft.id, {
        body: finalBody,
        status: nextStatus,
      });

      if (approval.decision === "approved") {
        const eventScope = scopeFromRow(draft);
        event = await createInflectExportEvent({
          userEmail,
          eventType: "draft_response_approved",
          actor: {
            type: "user",
            email: userEmail,
            name: session.user?.name || null,
          },
          scope: eventScope,
          source: {
            type: "gmail_thread",
            account_email: draft.account_email,
            thread_id: draft.thread_id,
            reply_to_message_id: draft.reply_to_message_id,
          },
          payload: {
            draft_id: draft.id,
            to: draft.to_email,
            subject: draft.subject,
            body: draft.body,
            rationale: draft.rationale,
          },
          approval: {
            id: approval.id,
            decision: approval.decision,
            decided_at: approval.decided_at,
            edited: Boolean(editedPayload?.body && editedPayload.body !== draft.original_body),
          },
          aiCallRef: draft.ai_call_id,
          sourceRefs: draft.source_refs || [],
        });
      }
    }

    await auditLog({
      userEmail,
      action: "approval_recorded",
      targetType: approval.target_type,
      targetId: approval.target_id,
      metadata: { decision: approval.decision, eventId: event?.id || null },
      scope,
    }).catch(() => {});

    return Response.json({ approval, draft, event });
  } catch (error) {
    return jsonError(error, "Failed to record approval");
  }
}
