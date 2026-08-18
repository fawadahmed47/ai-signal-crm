-- Replace identities created by older local fixtures with the current
-- AI Signal CRM seed users. This keeps existing commercial history intact.

UPDATE accounts
SET owner_email = CASE
  WHEN owner_email = 'manager@mamahealth.demo' THEN 'manager@aisignalcrm.local'
  ELSE 'marketer@aisignalcrm.local'
END
WHERE owner_email IN (
  'manager@mamahealth.demo',
  'marketer@mamahealth.demo',
  'jamie.smith@example.com'
);

UPDATE opportunities
SET owner_email = CASE
  WHEN owner_email = 'manager@mamahealth.demo' THEN 'manager@aisignalcrm.local'
  ELSE 'marketer@aisignalcrm.local'
END
WHERE owner_email IN (
  'manager@mamahealth.demo',
  'marketer@mamahealth.demo',
  'jamie.smith@example.com'
);

UPDATE crm_tasks
SET assignee_email = CASE
  WHEN assignee_email = 'manager@mamahealth.demo' THEN 'manager@aisignalcrm.local'
  ELSE 'marketer@aisignalcrm.local'
END
WHERE assignee_email IN (
  'manager@mamahealth.demo',
  'marketer@mamahealth.demo',
  'jamie.smith@example.com'
);

UPDATE signal_reviews
SET reviewer_email = CASE
  WHEN reviewer_email = 'manager@mamahealth.demo' THEN 'manager@aisignalcrm.local'
  ELSE 'marketer@aisignalcrm.local'
END
WHERE reviewer_email IN (
  'manager@mamahealth.demo',
  'marketer@mamahealth.demo',
  'jamie.smith@example.com'
);

UPDATE activity_events
SET actor_email = CASE
  WHEN actor_email = 'manager@mamahealth.demo' THEN 'manager@aisignalcrm.local'
  ELSE 'marketer@aisignalcrm.local'
END
WHERE actor_email IN (
  'manager@mamahealth.demo',
  'marketer@mamahealth.demo',
  'jamie.smith@example.com'
);

UPDATE outreach_drafts
SET generated_by_email = CASE
  WHEN generated_by_email = 'manager@mamahealth.demo' THEN 'manager@aisignalcrm.local'
  ELSE 'marketer@aisignalcrm.local'
END
WHERE generated_by_email IN (
  'manager@mamahealth.demo',
  'marketer@mamahealth.demo',
  'jamie.smith@example.com'
);
