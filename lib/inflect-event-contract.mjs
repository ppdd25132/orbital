export const INFLECT_EVENT_TYPES = Object.freeze([
  "communication_message_seen",
  "draft_response_approved",
  "client_obligation_candidate",
  "context_fragment_candidate",
  "decision_candidate",
  "followup_candidate",
  "email_source_artifact",
]);

export const INGESTION_STATUS = Object.freeze({
  NOT_INGESTED: "not_ingested_by_inflect",
  EXPORTED: "exported_not_ingested",
});

export const INFLECT_SCOPE_KEYS = Object.freeze([
  "tenant_id",
  "firm_id",
  "practice_id",
  "practitioner_id",
  "entity_id",
  "client_id",
  "engagement_id",
  "external_scope_ref",
]);

export function normalizeScope(scope = {}) {
  return Object.fromEntries(
    INFLECT_SCOPE_KEYS.map((key) => [key, scope?.[key] || null])
  );
}

export function validateInflectEventEnvelope(event) {
  const errors = [];

  if (!event || typeof event !== "object") {
    return ["Event envelope must be an object"];
  }

  if (!INFLECT_EVENT_TYPES.includes(event.event_type)) {
    errors.push(`Unsupported event_type: ${event.event_type || "(missing)"}`);
  }

  if (!event.occurred_at || Number.isNaN(Date.parse(event.occurred_at))) {
    errors.push("occurred_at must be a valid ISO date string");
  }

  for (const key of ["actor", "scope", "source", "payload", "approval", "source_refs"]) {
    if (event[key] === undefined || event[key] === null) {
      errors.push(`${key} is required`);
    }
  }

  if (
    event.ingestion_status &&
    !Object.values(INGESTION_STATUS).includes(event.ingestion_status)
  ) {
    errors.push(`Unsupported ingestion_status: ${event.ingestion_status}`);
  }

  return errors;
}

export function buildInflectEvent({
  id,
  eventType,
  occurredAt = new Date().toISOString(),
  actor,
  scope = {},
  source,
  payload,
  approval,
  aiCallRef = null,
  sourceRefs = [],
  ingestionStatus = INGESTION_STATUS.NOT_INGESTED,
} = {}) {
  if (!id) throw new Error("Event id is required");

  const event = {
    id,
    event_type: eventType,
    occurred_at: occurredAt,
    actor: actor || {},
    scope: normalizeScope(scope),
    source: source || {},
    payload: payload || {},
    approval: approval || {},
    ai_call_ref: aiCallRef,
    source_refs: Array.isArray(sourceRefs) ? sourceRefs : [],
    ingestion_status: ingestionStatus,
  };

  const errors = validateInflectEventEnvelope(event);
  if (errors.length) {
    throw new Error(`Invalid Inflect event envelope: ${errors.join("; ")}`);
  }

  return event;
}
