import "server-only";

import { getDatabasePool } from "@/data/db";
import type { DailySalesWorkspaceDTO } from "@/types/sales-workspace";

export async function getDailySalesWorkspace(): Promise<DailySalesWorkspaceDTO> {
  const pool = getDatabasePool();
  const [priority, overdue, summary] = await Promise.all([
    pool.query<{ id:string;company_name:string;lifecycle_stage:DailySalesWorkspaceDTO["priorityAccounts"][number]["lifecycleStage"];score:number;pipeline_value:string;next_task:string|null;due_at:Date|null;has_contact:boolean }>(
      `WITH account_signal AS (SELECT company_id,max(opportunity_score) AS score FROM signals WHERE status='approved' GROUP BY company_id),
       account_pipeline AS (SELECT account_id,COALESCE(sum(amount_usd) FILTER (WHERE stage NOT IN ('won','lost')),0) AS pipeline_value FROM opportunities GROUP BY account_id),
       next_task AS (SELECT DISTINCT ON (account_id) account_id,title,due_at FROM crm_tasks WHERE status IN ('open','in_progress') ORDER BY account_id,due_at NULLS LAST,created_at DESC)
       SELECT a.id::text,c.canonical_name AS company_name,a.commercial_lifecycle_stage AS lifecycle_stage,COALESCE(s.score,0) AS score,COALESCE(p.pipeline_value,0)::text AS pipeline_value,t.title AS next_task,t.due_at,EXISTS(SELECT 1 FROM account_contacts ct WHERE ct.account_id=a.id) AS has_contact
       FROM accounts a JOIN companies c ON c.id=a.company_id LEFT JOIN account_signal s ON s.company_id=a.company_id LEFT JOIN account_pipeline p ON p.account_id=a.id LEFT JOIN next_task t ON t.account_id=a.id
       ORDER BY (t.due_at IS NOT NULL) DESC,COALESCE(s.score,0) DESC,p.pipeline_value DESC LIMIT 12`,
    ),
    pool.query<{ id:string;account_id:string;company_name:string;title:string;due_at:Date|null }>(
      `SELECT t.id::text,t.account_id::text,c.canonical_name AS company_name,t.title,t.due_at FROM crm_tasks t JOIN accounts a ON a.id=t.account_id JOIN companies c ON c.id=a.company_id WHERE t.status IN ('open','in_progress') AND t.due_at IS NOT NULL AND t.due_at <= now() ORDER BY t.due_at ASC LIMIT 12`,
    ),
    pool.query<{ priority_leads:string;follow_ups_due:string;accounts_needing_contact:string;pipeline_at_risk:string }>(
      `WITH account_scores AS (SELECT company_id,max(opportunity_score) AS score FROM signals WHERE status='approved' GROUP BY company_id)
       SELECT (SELECT count(*) FROM account_scores WHERE score>=70)::text AS priority_leads,
              (SELECT count(*) FROM crm_tasks WHERE status IN ('open','in_progress') AND due_at IS NOT NULL AND due_at<=now())::text AS follow_ups_due,
              (SELECT count(*) FROM accounts a WHERE NOT EXISTS(SELECT 1 FROM account_contacts ct WHERE ct.account_id=a.id))::text AS accounts_needing_contact,
              (SELECT count(*) FROM opportunities WHERE stage IN ('identified','qualified') AND expected_close_date IS NOT NULL AND expected_close_date<current_date+interval '30 days')::text AS pipeline_at_risk`,
    ),
  ]);
  const stats = summary.rows[0];
  return { priorityAccounts: priority.rows.map((row)=>({id:row.id,companyName:row.company_name,lifecycleStage:row.lifecycle_stage,score:row.score,pipelineValue:Number(row.pipeline_value),nextTask:row.next_task,dueAt:row.due_at?.toISOString()??null,hasContact:row.has_contact})), overdueTasks: overdue.rows.map((row)=>({id:row.id,accountId:row.account_id,companyName:row.company_name,title:row.title,dueAt:row.due_at?.toISOString()??null})), summary:{priorityLeads:Number(stats.priority_leads),followUpsDue:Number(stats.follow_ups_due),accountsNeedingContact:Number(stats.accounts_needing_contact),pipelineAtRisk:Number(stats.pipeline_at_risk)} };
}
