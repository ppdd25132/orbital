import { createHash, randomUUID } from "crypto";
import { assertApproved, buildApprovalRecord } from "@/lib/approval-policy.mjs";
import { buildInflectEvent, normalizeScope } from "@/lib/inflect-event-contract.mjs";
import { dbQuery, ensureOrbitalSchema, hasDatabaseConfig } from "@/lib/orbital-db";
import { decryptSecret, encryptSecret } from "@/lib/orbital-crypto";

const SCOPE_KEYS = [
  "tenant_id",
  "firm_id",
  "practice_id",
  "practitioner_id",
  "entity_id",
  "client_id",
  "engagement_id",
  "external_scope_ref",
];

function newId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function scopeValues(scope = {}) {
  const normalized = normalizeScope(scope);
  return SCOPE_KEYS.map((key) => normalized[key]);
}

function rowToDraft(row) {
  return row
    ? {
        ...row,
        source_refs: row.source_refs || [],
      }
    : null;
}

function stableReplayKey(event) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        event_type: event.event_type,
        occurred_at: event.occurred_at,
        actor: event.actor,
        scope: event.scope,
        source: event.source,
        payload: event.payload,
        approval: event.approval,
        ai_call_ref: event.ai_call_ref,
        source_refs: event.source_refs,
      })
    )
    .digest("hex");
}

async function requireDatabase() {
  if (!hasDatabaseConfig()) {
    const error = new Error("Durable Orbital storage is not configured");
    error.status = 503;
    throw error;
  }
  await ensureOrbitalSchema();
}

export async function recordAiCall({
  userEmail,
  provider = "anthropic",
  model,
  purpose,
  requestSummary = {},
  responseSummary = {},
  sourceRefs = [],
  status = "completed",
  error = null,
  scope = {},
}) {
  await requireDatabase();
  const id = newId("ai");
  await dbQuery(
    `INSERT INTO orbital_ai_calls (
      id, user_email, provider, model, purpose, request_summary, response_summary,
      source_refs, status, error,
      tenant_id, firm_id, practice_id, practitioner_id, entity_id, client_id, engagement_id, external_scope_ref
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      id,
      userEmail,
      provider,
      model,
      purpose,
      requestSummary,
      responseSummary,
      sourceRefs,
      status,
      error,
      ...scopeValues(scope),
    ]
  );
  return id;
}

export async function createDraft({
  userEmail,
  accountEmail,
  threadId,
  replyToMessageId,
  toEmail,
  subject,
  body,
  originalBody = null,
  rationale = "",
  aiCallId = null,
  sourceRefs = [],
  scope = {},
}) {
  await requireDatabase();
  const id = newId("draft");
  const result = await dbQuery(
    `INSERT INTO orbital_drafts (
      id, user_email, account_email, thread_id, reply_to_message_id, to_email, subject,
      body, original_body, rationale, ai_call_id, source_refs, status,
      tenant_id, firm_id, practice_id, practitioner_id, entity_id, client_id, engagement_id, external_scope_ref
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING *`,
    [
      id,
      userEmail,
      accountEmail || null,
      threadId || null,
      replyToMessageId || null,
      toEmail,
      subject,
      body,
      originalBody,
      rationale,
      aiCallId,
      sourceRefs,
      ...scopeValues(scope),
    ]
  );
  return rowToDraft(result.rows[0]);
}

export async function getDraftForUser(userEmail, draftId) {
  await requireDatabase();
  const result = await dbQuery(
    `SELECT * FROM orbital_drafts WHERE user_email = $1 AND id = $2 LIMIT 1`,
    [userEmail, draftId]
  );
  return rowToDraft(result.rows[0]);
}

export async function updateDraftBodyAndStatus(userEmail, draftId, { body, status }) {
  await requireDatabase();
  const result = await dbQuery(
    `UPDATE orbital_drafts
     SET body = COALESCE($3, body), status = COALESCE($4, status), updated_at = NOW()
     WHERE user_email = $1 AND id = $2
     RETURNING *`,
    [userEmail, draftId, body || null, status || null]
  );
  return rowToDraft(result.rows[0]);
}

export async function recordApproval({
  userEmail,
  targetType,
  targetId,
  decision,
  editedPayload = null,
  notes = "",
  scope = {},
}) {
  await requireDatabase();
  const record = buildApprovalRecord({
    id: newId("appr"),
    userEmail,
    targetType,
    targetId,
    decision,
    editedPayload,
    notes,
    scope,
  });

  const result = await dbQuery(
    `INSERT INTO orbital_approvals (
      id, user_email, target_type, target_id, decision, edited_payload, notes, decided_at,
      tenant_id, firm_id, practice_id, practitioner_id, entity_id, client_id, engagement_id, external_scope_ref
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING *`,
    [
      record.id,
      record.user_email,
      record.target_type,
      record.target_id,
      record.decision,
      record.edited_payload,
      record.notes,
      record.decided_at,
      ...scopeValues(scope),
    ]
  );

  return result.rows[0];
}

export async function getLatestApproval(userEmail, targetType, targetId) {
  await requireDatabase();
  const result = await dbQuery(
    `SELECT * FROM orbital_approvals
     WHERE user_email = $1 AND target_type = $2 AND target_id = $3
     ORDER BY decided_at DESC
     LIMIT 1`,
    [userEmail, targetType, targetId]
  );
  return result.rows[0] || null;
}

export async function requireApprovedTarget(userEmail, targetType, targetId) {
  const approval = await getLatestApproval(userEmail, targetType, targetId);
  return assertApproved(approval, { targetType, targetId });
}

export async function createScheduledSend({
  userEmail,
  draftId,
  approvalId,
  scheduledFor,
  scope = {},
}) {
  await requireDatabase();
  const id = newId("sched");
  const result = await dbQuery(
    `INSERT INTO orbital_scheduled_sends (
      id, user_email, draft_id, approval_id, scheduled_for, status,
      tenant_id, firm_id, practice_id, practitioner_id, entity_id, client_id, engagement_id, external_scope_ref
    ) VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [id, userEmail, draftId, approvalId, scheduledFor, ...scopeValues(scope)]
  );
  return result.rows[0];
}

export async function listDueScheduledSends(limit = 10) {
  await requireDatabase();
  const result = await dbQuery(
    `SELECT s.*, d.to_email, d.subject, d.body, d.reply_to_message_id, d.account_email
     FROM orbital_scheduled_sends s
     JOIN orbital_drafts d ON d.id = s.draft_id
     WHERE s.status = 'pending' AND s.scheduled_for <= NOW()
     ORDER BY s.scheduled_for ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function updateScheduledSendStatus(userEmail, scheduleId, status, metadata = {}) {
  await requireDatabase();
  const result = await dbQuery(
    `UPDATE orbital_scheduled_sends
     SET status = $3, last_error = $4, sent_message_id = $5, updated_at = NOW()
     WHERE user_email = $1 AND id = $2
     RETURNING *`,
    [userEmail, scheduleId, status, metadata.lastError || null, metadata.sentMessageId || null]
  );
  return result.rows[0] || null;
}

export async function createInflectExportEvent({ userEmail, ...input }) {
  await requireDatabase();
  const event = buildInflectEvent({
    id: input.id || newId("evt"),
    ...input,
  });
  const replayKey = stableReplayKey(event);

  await dbQuery(
    `INSERT INTO orbital_integration_events (
      id, user_email, event_type, occurred_at, actor, scope, source, payload, approval,
      ai_call_ref, source_refs, ingestion_status, replay_key,
      tenant_id, firm_id, practice_id, practitioner_id, entity_id, client_id, engagement_id, external_scope_ref
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [
      event.id,
      userEmail,
      event.event_type,
      event.occurred_at,
      event.actor,
      event.scope,
      event.source,
      event.payload,
      event.approval,
      event.ai_call_ref,
      event.source_refs,
      event.ingestion_status,
      replayKey,
      ...scopeValues(event.scope),
    ]
  );

  return { ...event, replay_key: replayKey };
}

export async function listInflectExportEvents(userEmail, { limit = 100 } = {}) {
  await requireDatabase();
  const result = await dbQuery(
    `SELECT *
     FROM orbital_integration_events
     WHERE user_email = $1 AND ingestion_status = 'not_ingested_by_inflect'
     ORDER BY occurred_at DESC
     LIMIT $2`,
    [userEmail, Math.min(Number(limit) || 100, 250)]
  );
  return result.rows;
}

export async function createClientMapping({
  userEmail,
  mappingType,
  mappingValue,
  displayName,
  scope = {},
  metadata = {},
}) {
  await requireDatabase();
  const id = newId("map");
  const result = await dbQuery(
    `INSERT INTO orbital_client_mappings (
      id, user_email, mapping_type, mapping_value, display_name,
      tenant_id, firm_id, practice_id, practitioner_id, entity_id, client_id, engagement_id, external_scope_ref,
      metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (user_email, mapping_type, mapping_value) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      tenant_id = EXCLUDED.tenant_id,
      firm_id = EXCLUDED.firm_id,
      practice_id = EXCLUDED.practice_id,
      practitioner_id = EXCLUDED.practitioner_id,
      entity_id = EXCLUDED.entity_id,
      client_id = EXCLUDED.client_id,
      engagement_id = EXCLUDED.engagement_id,
      external_scope_ref = EXCLUDED.external_scope_ref,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *`,
    [id, userEmail, mappingType, mappingValue, displayName, ...scopeValues(scope), metadata]
  );
  return result.rows[0];
}

export async function listClientMappings(userEmail) {
  await requireDatabase();
  const result = await dbQuery(
    `SELECT * FROM orbital_client_mappings WHERE user_email = $1 ORDER BY updated_at DESC`,
    [userEmail]
  );
  return result.rows;
}

export async function upsertConnectedAccount(userEmail, account) {
  await requireDatabase();
  const id = newId("acct");
  const result = await dbQuery(
    `INSERT INTO orbital_accounts (
      id, user_email, account_email, display_name, provider, access_token_ciphertext,
      refresh_token_ciphertext, token_expires_at
    ) VALUES ($1,$2,$3,$4,'gmail',$5,$6,$7)
    ON CONFLICT (user_email, account_email) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      access_token_ciphertext = EXCLUDED.access_token_ciphertext,
      refresh_token_ciphertext = COALESCE(EXCLUDED.refresh_token_ciphertext, orbital_accounts.refresh_token_ciphertext),
      token_expires_at = EXCLUDED.token_expires_at,
      updated_at = NOW()
    RETURNING id, user_email, account_email, display_name, provider, token_expires_at, created_at, updated_at`,
    [
      id,
      userEmail,
      account.email,
      account.name || account.email,
      encryptSecret(account.access_token),
      encryptSecret(account.refresh_token),
      account.token_expiry ? new Date(account.token_expiry * 1000).toISOString() : null,
    ]
  );
  return result.rows[0];
}

export async function listConnectedAccounts(userEmail) {
  await requireDatabase();
  const result = await dbQuery(
    `SELECT id, account_email AS email, display_name AS name, provider, token_expires_at
     FROM orbital_accounts
     WHERE user_email = $1
     ORDER BY account_email ASC`,
    [userEmail]
  );
  return result.rows;
}

export async function getConnectedAccountToken(userEmail, accountEmail) {
  await requireDatabase();
  const result = await dbQuery(
    `SELECT access_token_ciphertext, refresh_token_ciphertext, token_expires_at
     FROM orbital_accounts
     WHERE user_email = $1 AND account_email = $2
     LIMIT 1`,
    [userEmail, accountEmail]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    access_token: decryptSecret(row.access_token_ciphertext),
    refresh_token: decryptSecret(row.refresh_token_ciphertext),
    token_expiry: row.token_expires_at
      ? Math.floor(new Date(row.token_expires_at).getTime() / 1000)
      : null,
  };
}

export async function deleteConnectedAccount(userEmail, accountEmail) {
  await requireDatabase();
  await dbQuery(
    `DELETE FROM orbital_accounts WHERE user_email = $1 AND account_email = $2`,
    [userEmail, accountEmail]
  );
}

export async function auditLog({
  userEmail,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
  scope = {},
}) {
  await requireDatabase();
  await dbQuery(
    `INSERT INTO orbital_audit_logs (
      id, user_email, action, target_type, target_id, metadata,
      tenant_id, firm_id, practice_id, practitioner_id, entity_id, client_id, engagement_id, external_scope_ref
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [newId("audit"), userEmail, action, targetType, targetId, metadata, ...scopeValues(scope)]
  );
}
