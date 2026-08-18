DO $$ BEGIN
  CREATE TYPE commercial_lifecycle_stage AS ENUM (
    'new',
    'enriched',
    'marketing_qualified',
    'sales_accepted',
    'opportunity',
    'won',
    'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS lifecycle_stage commercial_lifecycle_stage NOT NULL DEFAULT 'new';

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS commercial_lifecycle_stage commercial_lifecycle_stage NOT NULL DEFAULT 'sales_accepted';

ALTER TABLE signal_corrections
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL;

UPDATE signals
SET lifecycle_stage = CASE
  WHEN status = 'approved' THEN 'sales_accepted'::commercial_lifecycle_stage
  WHEN company_id IS NOT NULL AND opportunity_score >= 70 THEN 'marketing_qualified'::commercial_lifecycle_stage
  WHEN company_id IS NOT NULL THEN 'enriched'::commercial_lifecycle_stage
  ELSE 'new'::commercial_lifecycle_stage
END;

UPDATE accounts account
SET commercial_lifecycle_stage = CASE
  WHEN EXISTS (SELECT 1 FROM opportunities opportunity WHERE opportunity.account_id = account.id AND opportunity.stage = 'won')
    THEN 'won'::commercial_lifecycle_stage
  WHEN EXISTS (SELECT 1 FROM opportunities opportunity WHERE opportunity.account_id = account.id AND opportunity.stage = 'lost')
       AND NOT EXISTS (SELECT 1 FROM opportunities opportunity WHERE opportunity.account_id = account.id AND opportunity.stage <> 'lost')
    THEN 'lost'::commercial_lifecycle_stage
  WHEN EXISTS (SELECT 1 FROM opportunities opportunity WHERE opportunity.account_id = account.id)
    THEN 'opportunity'::commercial_lifecycle_stage
  ELSE 'sales_accepted'::commercial_lifecycle_stage
END;

CREATE INDEX IF NOT EXISTS signals_lifecycle_stage_idx
  ON signals (lifecycle_stage, imported_at DESC);

CREATE INDEX IF NOT EXISTS accounts_commercial_lifecycle_stage_idx
  ON accounts (commercial_lifecycle_stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS signal_corrections_pending_review_idx
  ON signal_corrections (corrected_at DESC)
  WHERE reviewed_at IS NULL;

CREATE OR REPLACE FUNCTION sync_account_commercial_lifecycle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE accounts account
  SET commercial_lifecycle_stage = CASE
    WHEN EXISTS (SELECT 1 FROM opportunities opportunity WHERE opportunity.account_id=account.id AND opportunity.stage='won') THEN 'won'::commercial_lifecycle_stage
    WHEN EXISTS (SELECT 1 FROM opportunities opportunity WHERE opportunity.account_id=account.id AND opportunity.stage='lost')
         AND NOT EXISTS (SELECT 1 FROM opportunities opportunity WHERE opportunity.account_id=account.id AND opportunity.stage<>'lost') THEN 'lost'::commercial_lifecycle_stage
    ELSE 'opportunity'::commercial_lifecycle_stage
  END,
  updated_at = now()
  WHERE account.id = COALESCE(NEW.account_id, OLD.account_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS opportunities_sync_commercial_lifecycle ON opportunities;
CREATE TRIGGER opportunities_sync_commercial_lifecycle
AFTER INSERT OR UPDATE OF stage, account_id ON opportunities
FOR EACH ROW EXECUTE FUNCTION sync_account_commercial_lifecycle();
