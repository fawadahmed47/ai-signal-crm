BEGIN;
CREATE INDEX idx_tasks_account_status_due ON crm_tasks (account_id, status, due_at);
COMMIT;
