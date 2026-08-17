BEGIN;

CREATE TABLE outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_signal_id uuid REFERENCES signals(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'archived')),
  generated_by_email text NOT NULL,
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_drafts_account_time
  ON outreach_drafts (account_id, created_at DESC);

CREATE TRIGGER outreach_drafts_set_updated_at BEFORE UPDATE ON outreach_drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
