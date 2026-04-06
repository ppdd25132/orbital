-- Accounts: linked Google/OAuth accounts per user
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_account_id)
);

-- Clients: contacts/companies tracked in the CRM
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages: synced Gmail messages linked to clients
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT NOT NULL UNIQUE,
  gmail_thread_id TEXT NOT NULL,
  account_id UUID REFERENCES accounts (id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
  subject TEXT,
  from_address TEXT,
  to_address TEXT,
  snippet TEXT,
  body TEXT,
  label_ids TEXT[],
  internal_date BIGINT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages (gmail_thread_id);
CREATE INDEX IF NOT EXISTS messages_client_idx ON messages (client_id);
CREATE INDEX IF NOT EXISTS messages_account_idx ON messages (account_id);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts (user_id);
