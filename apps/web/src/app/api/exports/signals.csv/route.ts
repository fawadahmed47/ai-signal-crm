import { getDemoSession } from "@/data/demo-session";
import { getDatabasePool } from "@/data/db";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const session = await getDemoSession();
  if (!session || session.role !== "manager") return new Response("Manager access required", { status: 403 });

  const result = await getDatabasePool().query<{
    company: string | null; title: string; category: string; location: string | null;
    power_mw: string | null; investment_usd_millions: string | null; score: number | null;
    status: string; source: string | null; evidence_url: string | null; imported_at: Date;
  }>(
    `SELECT c.canonical_name AS company, s.title, s.category, s.location_text AS location,
            s.power_capacity_mw::text AS power_mw, s.investment_usd_millions::text,
            s.opportunity_score AS score, s.status::text, ss.name AS source,
            (SELECT e.url FROM signal_evidence e WHERE e.signal_id=s.id ORDER BY e.created_at LIMIT 1) AS evidence_url,
            s.imported_at
     FROM signals s LEFT JOIN companies c ON c.id=s.company_id LEFT JOIN signal_sources ss ON ss.id=s.source_id
     ORDER BY s.opportunity_score DESC NULLS LAST, s.imported_at DESC`,
  );
  const header = ["Company", "Signal", "Category", "Location", "Power MW", "Investment USD millions", "Opportunity score", "Review status", "Source", "Evidence URL", "Imported at"];
  const body = result.rows.map((row) => [row.company, row.title, row.category, row.location, row.power_mw, row.investment_usd_millions, row.score, row.status, row.source, row.evidence_url, row.imported_at.toISOString()].map(csvCell).join(","));
  return new Response([header.map(csvCell).join(","), ...body].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=cleaned-signal-leads.csv" } });
}
