import { getUserSession } from "@/data/auth-session";
import { getDatabasePool } from "@/data/db";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function optionalNumber(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session || session.role !== "manager") return new Response("Manager access required", { status: 403 });

  const url = new URL(request.url);
  const status = ["pending", "approved", "rejected"].includes(url.searchParams.get("status") ?? "") ? url.searchParams.get("status") : null;
  const minimumScore = optionalNumber(url.searchParams.get("minScore"));
  const lifecycle = ["new", "enriched", "marketing_qualified", "sales_accepted", "opportunity", "won", "lost"].includes(url.searchParams.get("lifecycle") ?? "") ? url.searchParams.get("lifecycle") : null;

  const result = await getDatabasePool().query<{
    company: string | null; title: string; category: string; location: string | null;
    power_mw: string | null; investment_usd_millions: string | null; score: number | null;
    status: string; lifecycle_stage: string; owner_email: string | null; next_action: string | null;
    source: string | null; evidence_url: string | null; imported_at: Date;
  }>(
    `SELECT c.canonical_name AS company, s.title, s.category, s.location_text AS location,
            s.power_capacity_mw::text AS power_mw, s.investment_usd_millions::text,
            s.opportunity_score AS score, s.status::text, s.lifecycle_stage::text,
            a.owner_email,
            (SELECT task.title FROM crm_tasks task WHERE task.account_id=a.id AND task.status IN ('open','in_progress') ORDER BY task.due_at NULLS LAST, task.created_at LIMIT 1) AS next_action,
            ss.name AS source,
            (SELECT e.url FROM signal_evidence e WHERE e.signal_id=s.id ORDER BY e.created_at LIMIT 1) AS evidence_url,
            s.imported_at
     FROM signals s
     LEFT JOIN companies c ON c.id=s.company_id
     LEFT JOIN accounts a ON a.created_from_signal_id=s.id
     LEFT JOIN signal_sources ss ON ss.id=s.source_id
     WHERE ($1::text IS NULL OR s.status::text=$1)
       AND ($2::integer IS NULL OR s.opportunity_score >= $2)
       AND ($3::text IS NULL OR s.lifecycle_stage::text=$3)
     ORDER BY s.opportunity_score DESC NULLS LAST, s.imported_at DESC`,
    [status, minimumScore, lifecycle],
  );
  const header = ["Company", "Signal", "Category", "Location", "Power MW", "Investment USD millions", "Opportunity score", "Review status", "Lifecycle", "Owner", "Next action", "Source", "Evidence URL", "Imported at"];
  const body = result.rows.map((row) => [row.company, row.title, row.category, row.location, row.power_mw, row.investment_usd_millions, row.score, row.status, row.lifecycle_stage, row.owner_email, row.next_action, row.source, row.evidence_url, row.imported_at.toISOString()].map(csvCell).join(","));
  return new Response([header.map(csvCell).join(","), ...body].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=cleaned-signal-leads.csv" } });
}
