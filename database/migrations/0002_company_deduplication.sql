BEGIN;

CREATE OR REPLACE FUNCTION normalize_company_name(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  normalized text;
  original_tokens text;
BEGIN
  normalized := lower(normalize(value, NFKC));
  normalized := replace(normalized, '&', ' and ');
  normalized := trim(regexp_replace(normalized, '[^[:alnum:]]+', ' ', 'g'));
  original_tokens := normalized;
  normalized := regexp_replace(normalized, '^the ', '');

  LOOP
    EXIT WHEN normalized !~ ' (ag|bv|co|company|corp|corporation|gmbh|inc|incorporated|limited|llc|ltd|nv|plc|sa|sas)$';
    normalized := regexp_replace(
      normalized,
      ' (ag|bv|co|company|corp|corporation|gmbh|inc|incorporated|limited|llc|ltd|nv|plc|sa|sas)$',
      ''
    );
  END LOOP;

  IF normalized = '' THEN
    RETURN original_tokens;
  END IF;
  RETURN normalized;
END;
$$;

-- Preserve the old and selected identities while duplicate rows are consolidated.
CREATE TEMPORARY TABLE company_deduplication_map ON COMMIT DROP AS
WITH identified AS (
  SELECT
    id,
    canonical_name,
    normalized_name AS previous_normalized_name,
    COALESCE(NULLIF(normalize_company_name(canonical_name), ''), normalized_name) AS identity_key,
    created_at
  FROM companies
)
SELECT
  id AS previous_company_id,
  first_value(id) OVER (
    PARTITION BY identity_key
    ORDER BY created_at, id
  ) AS retained_company_id,
  canonical_name AS previous_canonical_name,
  previous_normalized_name,
  identity_key
FROM identified;

-- If duplicate companies both have accounts, retain the older company's account
-- and move its dependent commercial history before removing the duplicate account.
CREATE TEMPORARY TABLE account_deduplication_map ON COMMIT DROP AS
WITH grouped_accounts AS (
  SELECT
    account.id,
    mapping.retained_company_id,
    first_value(account.id) OVER (
      PARTITION BY mapping.retained_company_id
      ORDER BY account.created_at, account.id
    ) AS retained_account_id
  FROM company_deduplication_map mapping
  JOIN accounts account ON account.company_id = mapping.previous_company_id
)
SELECT
  id AS previous_account_id,
  retained_account_id,
  retained_company_id
FROM grouped_accounts;

UPDATE opportunities opportunity
SET account_id = mapping.retained_account_id
FROM account_deduplication_map mapping
WHERE opportunity.account_id = mapping.previous_account_id
  AND mapping.previous_account_id <> mapping.retained_account_id;

UPDATE crm_tasks task
SET account_id = mapping.retained_account_id
FROM account_deduplication_map mapping
WHERE task.account_id = mapping.previous_account_id
  AND mapping.previous_account_id <> mapping.retained_account_id;

UPDATE activity_events event
SET account_id = mapping.retained_account_id
FROM account_deduplication_map mapping
WHERE event.account_id = mapping.previous_account_id
  AND mapping.previous_account_id <> mapping.retained_account_id;

DELETE FROM accounts account
USING account_deduplication_map mapping
WHERE account.id = mapping.previous_account_id
  AND mapping.previous_account_id <> mapping.retained_account_id;

UPDATE accounts account
SET company_id = mapping.retained_company_id
FROM account_deduplication_map mapping
WHERE account.id = mapping.retained_account_id
  AND account.company_id <> mapping.retained_company_id;

UPDATE signals signal
SET company_id = mapping.retained_company_id
FROM company_deduplication_map mapping
WHERE signal.company_id = mapping.previous_company_id
  AND mapping.previous_company_id <> mapping.retained_company_id;

DELETE FROM companies company
USING company_deduplication_map mapping
WHERE company.id = mapping.previous_company_id
  AND mapping.previous_company_id <> mapping.retained_company_id;

UPDATE companies company
SET normalized_name = mapping.identity_key
FROM company_deduplication_map mapping
WHERE company.id = mapping.retained_company_id
  AND company.normalized_name <> mapping.identity_key;

CREATE TABLE company_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  alias_name text NOT NULL CHECK (alias_name = trim(alias_name) AND alias_name <> ''),
  normalized_alias text NOT NULL UNIQUE CHECK (normalized_alias <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_aliases_company ON company_aliases (company_id);

INSERT INTO company_aliases (company_id, alias_name, normalized_alias)
SELECT DISTINCT ON (identity_key)
  retained_company_id,
  previous_canonical_name,
  identity_key
FROM company_deduplication_map
ORDER BY identity_key, previous_company_id
ON CONFLICT (normalized_alias) DO NOTHING;

COMMIT;
