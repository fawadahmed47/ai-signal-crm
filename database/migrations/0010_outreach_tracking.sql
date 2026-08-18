BEGIN;

ALTER TABLE outreach_drafts
  DROP CONSTRAINT IF EXISTS outreach_drafts_status_check;

ALTER TABLE outreach_drafts
  ADD CONSTRAINT outreach_drafts_status_check
  CHECK (status IN ('draft', 'sent', 'archived'));

ALTER TABLE outreach_drafts
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_by_email text;

CREATE INDEX IF NOT EXISTS outreach_drafts_sent_idx
  ON outreach_drafts (sent_at DESC)
  WHERE status = 'sent';

COMMIT;
