BEGIN;

CREATE TYPE app_user_role AS ENUM ('manager', 'marketer');

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL,
  role app_user_role NOT NULL,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_users_email_normalized CHECK (email = lower(btrim(email)))
);
CREATE UNIQUE INDEX app_users_email_unique ON app_users (lower(email));

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_sessions_active_token ON user_sessions (token_hash, expires_at);
CREATE INDEX user_sessions_expired ON user_sessions (expires_at);

CREATE TABLE ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES signal_sources(id) ON DELETE SET NULL,
  triggered_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX ingestion_runs_recent ON ingestion_runs (started_at DESC);
CREATE INDEX ingestion_runs_running ON ingestion_runs (started_at) WHERE status = 'running';

CREATE TABLE signal_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  corrected_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  field_name text NOT NULL CHECK (field_name IN ('company', 'location', 'category', 'power_capacity_mw', 'investment_usd_millions')),
  old_value text,
  new_value text NOT NULL,
  reason text,
  corrected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX signal_corrections_signal_time ON signal_corrections (signal_id, corrected_at DESC);

CREATE TABLE saved_signal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE account_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  job_title text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_contacts_account ON account_contacts (account_id, is_primary DESC, created_at DESC);
CREATE UNIQUE INDEX account_contacts_primary ON account_contacts (account_id) WHERE is_primary;

CREATE TABLE account_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_notes_account_time ON account_notes (account_id, created_at DESC);

CREATE INDEX signals_pending_high_value ON signals (opportunity_score DESC, imported_at DESC)
  WHERE status = 'pending';
CREATE INDEX signals_investment_filter ON signals (investment_usd_millions)
  WHERE investment_usd_millions IS NOT NULL;
CREATE INDEX signals_power_filter ON signals (power_capacity_mw)
  WHERE power_capacity_mw IS NOT NULL;

CREATE TRIGGER app_users_set_updated_at BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER saved_signal_views_set_updated_at BEFORE UPDATE ON saved_signal_views
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER account_contacts_set_updated_at BEFORE UPDATE ON account_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO app_users (email, display_name, role, password_hash)
VALUES
  ('manager@aisignalcrm.local', 'Alex Morgan', 'manager', crypt('Manager2026!', gen_salt('bf', 12))),
  ('marketer@aisignalcrm.local', 'Jamie Smith', 'marketer', crypt('Marketer2026!', gen_salt('bf', 12)));

COMMIT;
