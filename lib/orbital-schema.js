export const ORBITAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS orbital_accounts (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_email TEXT NOT NULL,
  display_name TEXT,
  provider TEXT NOT NULL DEFAULT 'gmail',
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, account_email)
);

CREATE TABLE IF NOT EXISTS orbital_contacts (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  account_email TEXT,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, email)
);

CREATE TABLE IF NOT EXISTS orbital_threads (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_email TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  last_message_at TIMESTAMPTZ,
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, account_email, gmail_thread_id)
);

CREATE TABLE IF NOT EXISTS orbital_messages (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_email TEXT NOT NULL,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT NOT NULL,
  subject TEXT,
  from_email TEXT,
  to_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ,
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, account_email, gmail_message_id)
);

CREATE TABLE IF NOT EXISTS orbital_ai_calls (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  purpose TEXT NOT NULL,
  request_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  error TEXT,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orbital_drafts (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_email TEXT,
  thread_id TEXT,
  reply_to_message_id TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  original_body TEXT,
  rationale TEXT,
  ai_call_id TEXT REFERENCES orbital_ai_calls(id) ON DELETE SET NULL,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orbital_approvals (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  edited_payload JSONB,
  notes TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orbital_scheduled_sends (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  draft_id TEXT NOT NULL REFERENCES orbital_drafts(id) ON DELETE CASCADE,
  approval_id TEXT NOT NULL REFERENCES orbital_approvals(id) ON DELETE RESTRICT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  sent_message_id TEXT,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orbital_snoozes (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  account_email TEXT,
  thread_id TEXT NOT NULL,
  snooze_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orbital_client_mappings (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  mapping_type TEXT NOT NULL,
  mapping_value TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_email, mapping_type, mapping_value)
);

CREATE TABLE IF NOT EXISTS orbital_integration_events (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  actor JSONB NOT NULL,
  scope JSONB NOT NULL,
  source JSONB NOT NULL,
  payload JSONB NOT NULL,
  approval JSONB NOT NULL,
  ai_call_ref TEXT,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ingestion_status TEXT NOT NULL DEFAULT 'not_ingested_by_inflect',
  replay_key TEXT,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orbital_audit_logs (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT,
  firm_id TEXT,
  practice_id TEXT,
  practitioner_id TEXT,
  entity_id TEXT,
  client_id TEXT,
  engagement_id TEXT,
  external_scope_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orbital_drafts_user_status ON orbital_drafts(user_email, status);
CREATE INDEX IF NOT EXISTS idx_orbital_approvals_target ON orbital_approvals(user_email, target_type, target_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_orbital_events_user_status ON orbital_integration_events(user_email, ingestion_status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_orbital_scheduled_due ON orbital_scheduled_sends(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_orbital_threads_user_account ON orbital_threads(user_email, account_email, last_message_at DESC);
`;
