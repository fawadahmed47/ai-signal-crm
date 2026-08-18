BEGIN;

ALTER TABLE account_contacts
  ADD COLUMN IF NOT EXISTS stakeholder_role text NOT NULL DEFAULT 'other'
    CHECK (stakeholder_role IN ('decision_maker', 'procurement', 'facilities', 'engineering', 'finance', 'champion', 'other')),
  ADD COLUMN IF NOT EXISTS engagement_status text NOT NULL DEFAULT 'identified'
    CHECK (engagement_status IN ('identified', 'contacted', 'replied', 'meeting_booked', 'not_a_fit')),
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

CREATE INDEX IF NOT EXISTS account_contacts_execution_idx
  ON account_contacts (account_id, engagement_status, next_follow_up_at NULLS LAST);

CREATE INDEX IF NOT EXISTS activity_events_account_type_time_idx
  ON activity_events (account_id, event_type, occurred_at DESC);

COMMIT;
