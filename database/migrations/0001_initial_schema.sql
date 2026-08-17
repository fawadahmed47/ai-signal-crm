BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE signal_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE opportunity_stage AS ENUM ('identified', 'qualified', 'proposal', 'won', 'lost');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  website text,
  country_code char(2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE signal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('rss', 'web', 'csv', 'salesforce', 'manual')),
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, source_url)
);

CREATE TABLE signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES signal_sources(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  external_id text,
  title text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  location_text text,
  power_capacity_mw numeric(12,2) CHECK (power_capacity_mw IS NULL OR power_capacity_mw >= 0),
  investment_usd_millions numeric(14,2) CHECK (investment_usd_millions IS NULL OR investment_usd_millions >= 0),
  occurred_at timestamptz,
  published_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  status signal_status NOT NULL DEFAULT 'pending',
  opportunity_score smallint CHECK (opportunity_score BETWEEN 0 AND 100),
  score_explanation text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE signal_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  url text NOT NULL,
  label text,
  excerpt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (signal_id, url)
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE RESTRICT,
  owner_email text NOT NULL,
  lifecycle_stage text NOT NULL DEFAULT 'prospect'
    CHECK (lifecycle_stage IN ('prospect', 'active', 'customer', 'inactive')),
  created_from_signal_id uuid REFERENCES signals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_signal_id uuid REFERENCES signals(id) ON DELETE SET NULL,
  name text NOT NULL,
  stage opportunity_stage NOT NULL DEFAULT 'identified',
  amount_usd numeric(14,2) CHECK (amount_usd IS NULL OR amount_usd >= 0),
  probability smallint CHECK (probability IS NULL OR probability BETWEEN 0 AND 100),
  owner_email text NOT NULL,
  expected_close_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE signal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  decision signal_status NOT NULL CHECK (decision <> 'pending'),
  reviewer_email text NOT NULL,
  reason text,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_email text NOT NULL,
  status task_status NOT NULL DEFAULT 'open',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (account_id IS NOT NULL OR opportunity_id IS NOT NULL)
);

CREATE TABLE activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES signals(id) ON DELETE SET NULL,
  actor_email text NOT NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CHECK (account_id IS NOT NULL OR opportunity_id IS NOT NULL OR signal_id IS NOT NULL)
);

CREATE INDEX idx_signals_review_queue ON signals (status, opportunity_score DESC, imported_at DESC);
CREATE INDEX idx_signals_company ON signals (company_id);
CREATE INDEX idx_signal_evidence_signal ON signal_evidence (signal_id);
CREATE INDEX idx_opportunities_account_stage ON opportunities (account_id, stage);
CREATE INDEX idx_tasks_assignee_status ON crm_tasks (assignee_email, status, due_at);
CREATE INDEX idx_activity_account_time ON activity_events (account_id, occurred_at DESC);

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_set_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER signals_set_updated_at BEFORE UPDATE ON signals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER accounts_set_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER opportunities_set_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER crm_tasks_set_updated_at BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
