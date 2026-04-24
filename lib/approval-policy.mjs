export const APPROVAL_DECISIONS = Object.freeze([
  "approved",
  "rejected",
  "needs_changes",
]);

export const APPROVABLE_TARGET_TYPES = Object.freeze([
  "draft_response",
  "scheduled_send",
  "client_mapping",
  "inflect_export_event",
  "label_change",
  "thread_status_change",
]);

export class ApprovalRequiredError extends Error {
  constructor(message = "Explicit user approval is required") {
    super(message);
    this.name = "ApprovalRequiredError";
    this.status = 403;
  }
}

export function normalizeApprovalDecision(decision) {
  const normalized = String(decision || "").trim().toLowerCase();
  if (!APPROVAL_DECISIONS.includes(normalized)) {
    throw new Error(`Invalid approval decision: ${decision || "(missing)"}`);
  }
  return normalized;
}

export function normalizeTargetType(targetType) {
  const normalized = String(targetType || "").trim().toLowerCase();
  if (!APPROVABLE_TARGET_TYPES.includes(normalized)) {
    throw new Error(`Invalid approval target type: ${targetType || "(missing)"}`);
  }
  return normalized;
}

export function buildApprovalRecord({
  id,
  userEmail,
  targetType,
  targetId,
  decision,
  editedPayload = null,
  notes = "",
  decidedAt = new Date().toISOString(),
  scope = {},
} = {}) {
  if (!id) throw new Error("Approval id is required");
  if (!userEmail) throw new Error("Approval userEmail is required");
  if (!targetId) throw new Error("Approval targetId is required");

  return {
    id,
    user_email: userEmail,
    target_type: normalizeTargetType(targetType),
    target_id: targetId,
    decision: normalizeApprovalDecision(decision),
    edited_payload: editedPayload,
    notes: notes || "",
    decided_at: decidedAt,
    scope: scope || {},
  };
}

export function assertApproved(approval, { targetType, targetId } = {}) {
  if (!approval) {
    throw new ApprovalRequiredError("No approval record found for this action");
  }

  if (targetType && approval.target_type !== normalizeTargetType(targetType)) {
    throw new ApprovalRequiredError("Approval target type does not match this action");
  }

  if (targetId && approval.target_id !== targetId) {
    throw new ApprovalRequiredError("Approval target id does not match this action");
  }

  if (approval.decision !== "approved") {
    throw new ApprovalRequiredError("This action has not been approved");
  }

  return approval;
}
