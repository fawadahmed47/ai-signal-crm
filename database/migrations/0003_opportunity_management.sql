BEGIN;

CREATE INDEX idx_opportunities_updated_at
  ON opportunities (updated_at DESC, created_at DESC);

COMMIT;
