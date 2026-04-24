import test from "node:test";
import assert from "node:assert/strict";

import {
  ApprovalRequiredError,
  assertApproved,
  buildApprovalRecord,
} from "../lib/approval-policy.mjs";

test("buildApprovalRecord normalizes an approved draft response", () => {
  const approval = buildApprovalRecord({
    id: "appr_1",
    userEmail: "user@example.com",
    targetType: "draft_response",
    targetId: "draft_1",
    decision: "APPROVED",
    editedPayload: { body: "Approved body" },
  });

  assert.equal(approval.decision, "approved");
  assert.equal(approval.target_type, "draft_response");
  assert.equal(approval.target_id, "draft_1");
});

test("assertApproved rejects missing or non-approved approvals", () => {
  assert.throws(
    () => assertApproved(null, { targetType: "draft_response", targetId: "draft_1" }),
    ApprovalRequiredError
  );

  assert.throws(
    () =>
      assertApproved(
        {
          target_type: "draft_response",
          target_id: "draft_1",
          decision: "rejected",
        },
        { targetType: "draft_response", targetId: "draft_1" }
      ),
    ApprovalRequiredError
  );
});

test("assertApproved accepts only the matching approved target", () => {
  const approval = {
    target_type: "draft_response",
    target_id: "draft_1",
    decision: "approved",
  };

  assert.equal(assertApproved(approval, { targetType: "draft_response", targetId: "draft_1" }), approval);
  assert.throws(
    () => assertApproved(approval, { targetType: "scheduled_send", targetId: "draft_1" }),
    ApprovalRequiredError
  );
});
