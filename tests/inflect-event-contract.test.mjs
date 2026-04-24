import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInflectEvent,
  normalizeScope,
  validateInflectEventEnvelope,
} from "../lib/inflect-event-contract.mjs";

test("normalizeScope preserves Inflect-shaped keys and nulls missing values", () => {
  assert.deepEqual(normalizeScope({ client_id: "client_1", external_scope_ref: "demo" }), {
    tenant_id: null,
    firm_id: null,
    practice_id: null,
    practitioner_id: null,
    entity_id: null,
    client_id: "client_1",
    engagement_id: null,
    external_scope_ref: "demo",
  });
});

test("buildInflectEvent creates a valid not-ingested export envelope", () => {
  const event = buildInflectEvent({
    id: "evt_1",
    eventType: "draft_response_approved",
    occurredAt: "2026-04-24T12:00:00.000Z",
    actor: { type: "user", email: "user@example.com" },
    scope: { client_id: "client_1" },
    source: { type: "gmail_thread", thread_id: "thread_1" },
    payload: { draft_id: "draft_1" },
    approval: { id: "appr_1", decision: "approved" },
    aiCallRef: "ai_1",
    sourceRefs: [{ type: "gmail_message", message_id: "msg_1" }],
  });

  assert.equal(event.event_type, "draft_response_approved");
  assert.equal(event.ingestion_status, "not_ingested_by_inflect");
  assert.equal(event.scope.client_id, "client_1");
  assert.deepEqual(validateInflectEventEnvelope(event), []);
});

test("validateInflectEventEnvelope rejects unsupported event types", () => {
  const errors = validateInflectEventEnvelope({
    event_type: "email_sent_directly",
    occurred_at: "2026-04-24T12:00:00.000Z",
    actor: {},
    scope: {},
    source: {},
    payload: {},
    approval: {},
    source_refs: [],
  });

  assert.ok(errors.some((error) => error.includes("Unsupported event_type")));
});
