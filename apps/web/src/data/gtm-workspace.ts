import "server-only";

import { getDatabasePool } from "@/data/db";
import type { GtmWorkspaceDTO } from "@/types/gtm";

export async function getGtmWorkspace(): Promise<GtmWorkspaceDTO> {
  const pool = getDatabasePool();
  const [campaigns, accounts, enrichment, routing] = await Promise.all([
    pool.query<{id:string;name:string;description:string|null;status:GtmWorkspaceDTO["campaigns"][number]["status"];owner_email:string;members:string;contacted:string;replies:string;meetings:string}>(
      `SELECT c.id::text,c.name,c.description,c.status,c.owner_email,
              count(m.account_id)::text AS members,
              count(m.account_id) FILTER (WHERE m.member_status='contacted')::text AS contacted,
              count(m.account_id) FILTER (WHERE m.member_status='replied')::text AS replies,
              count(m.account_id) FILTER (WHERE m.member_status='meeting_booked')::text AS meetings
       FROM campaigns c LEFT JOIN campaign_members m ON m.campaign_id=c.id
       GROUP BY c.id ORDER BY c.updated_at DESC`,
    ),
    pool.query<{id:string;company_name:string;score:number;lifecycle_stage:string}>(
      `SELECT a.id::text,c.canonical_name AS company_name,COALESCE(max(s.opportunity_score),0)::int AS score,a.commercial_lifecycle_stage::text AS lifecycle_stage
       FROM accounts a JOIN companies c ON c.id=a.company_id LEFT JOIN signals s ON s.company_id=c.id
       GROUP BY a.id,c.id,c.canonical_name ORDER BY max(s.opportunity_score) DESC NULLS LAST,c.canonical_name`,
    ),
    pool.query<{account_id:string;company_name:string;website:string|null;country_code:string|null;has_decision_maker:boolean;has_evidence:boolean;score:number}>(
      `SELECT a.id::text AS account_id,c.canonical_name AS company_name,c.website,c.country_code,
              EXISTS(SELECT 1 FROM account_contacts ct WHERE ct.account_id=a.id AND ct.stakeholder_role='decision_maker' AND ct.email IS NOT NULL) AS has_decision_maker,
              EXISTS(SELECT 1 FROM signals s JOIN signal_evidence e ON e.signal_id=s.id WHERE s.company_id=c.id AND e.url ~* '^https?://') AS has_evidence,
              COALESCE(max(s.opportunity_score),0)::int AS score
       FROM accounts a JOIN companies c ON c.id=a.company_id LEFT JOIN signals s ON s.company_id=c.id
       GROUP BY a.id,c.id,c.canonical_name,c.website,c.country_code ORDER BY max(s.opportunity_score) DESC NULLS LAST`,
    ),
    pool.query<{account_id:string;company_name:string;signal_id:string|null;score:number;investment:string|null;owner_email:string;routed_at:Date|null}>(
      `SELECT a.id::text AS account_id,c.canonical_name AS company_name,s.id::text AS signal_id,COALESCE(s.opportunity_score,0)::int AS score,
              s.investment_usd_millions::text AS investment,a.owner_email,latest.created_at AS routed_at
       FROM accounts a JOIN companies c ON c.id=a.company_id
       LEFT JOIN LATERAL (SELECT id,opportunity_score,investment_usd_millions FROM signals WHERE company_id=c.id ORDER BY opportunity_score DESC NULLS LAST,imported_at DESC LIMIT 1) s ON true
       LEFT JOIN LATERAL (SELECT created_at FROM lead_routing_audits WHERE account_id=a.id ORDER BY created_at DESC LIMIT 1) latest ON true
       ORDER BY COALESCE(s.opportunity_score,0) DESC,c.canonical_name`,
    ),
  ]);

  return {
    campaigns: campaigns.rows.map((row) => ({ id:row.id,name:row.name,description:row.description,status:row.status,ownerEmail:row.owner_email,members:Number(row.members),contacted:Number(row.contacted),replies:Number(row.replies),meetings:Number(row.meetings) })),
    availableAccounts: accounts.rows.map((row) => ({ id:row.id,companyName:row.company_name,score:row.score,lifecycleStage:row.lifecycle_stage })),
    enrichment: enrichment.rows.map((row) => ({ ...row, accountId:row.account_id, companyName:row.company_name, website:row.website, countryCode:row.country_code, hasDecisionMaker:row.has_decision_maker, hasEvidence:row.has_evidence, missing:[[!row.website,"Website"],[!row.country_code,"Country"],[!row.has_decision_maker,"Decision-maker contact"],[!row.has_evidence,"Verified evidence"]].filter(([missing])=>missing).map(([,label])=>label as string) })).filter((row) => row.missing.length > 0),
    routing: routing.rows.map((row) => {
      const enterprise = row.score >= 85 && Number(row.investment ?? 0) >= 10;
      return { accountId:row.account_id,companyName:row.company_name,signalId:row.signal_id,score:row.score,investmentUsdMillions:row.investment === null ? null : Number(row.investment),suggestedOwner:enterprise ? "manager@aisignalcrm.local" : "marketer@aisignalcrm.local",ruleName:enterprise ? "Enterprise investment escalation" : "Qualified lead nurture",rationale:enterprise ? `Score ${row.score} and reported investment of $${Number(row.investment).toFixed(1)}M meet the enterprise threshold.` : `Score ${row.score} is routed to the GTM marketer for enrichment and campaign activation.`,routedAt:row.routed_at?.toISOString() ?? null };
    }),
  };
}
