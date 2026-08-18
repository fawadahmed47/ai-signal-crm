BEGIN;

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 140),
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  owner_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaigns_status_updated_idx ON campaigns (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS campaign_members (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  member_status text NOT NULL DEFAULT 'ready' CHECK (member_status IN ('ready', 'contacted', 'replied', 'meeting_booked', 'removed')),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, account_id)
);
CREATE INDEX IF NOT EXISTS campaign_members_account_idx ON campaign_members (account_id, member_status);

CREATE TABLE IF NOT EXISTS lead_routing_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES signals(id) ON DELETE SET NULL,
  rule_name text NOT NULL,
  assigned_to_email text NOT NULL,
  rationale text NOT NULL,
  routed_by_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_routing_audits_account_time_idx ON lead_routing_audits (account_id, created_at DESC);

CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
