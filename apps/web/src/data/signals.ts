import "server-only";

import { getDatabasePool } from "@/data/db";
import type { SignalEvidenceDTO, SignalInboxDTO } from "@/types/signal";

type SignalRow = {
  id: string;
  company: string;
  headline: string;
  score: number | null;
  category: string;
  score_explanation: string | null;
  power_capacity_mw: string | null;
  investment_usd_millions: string | null;
  is_demo: boolean;
  detected_at: Date;
  evidence: Array<{ title: string; url: string }> | null;
};

function formatDetected(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatAge(value: Date, now: Date): string {
  const elapsedHours = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 3_600_000));
  if (elapsedHours < 1) return "<1h ago";
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return `${Math.floor(elapsedHours / 24)}d ago`;
}

function confidenceFor(score: number): SignalInboxDTO["confidence"] {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function publisherFor(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source evidence";
  }
}

export async function getPendingSignals(limit = 100): Promise<SignalInboxDTO[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const result = await getDatabasePool().query<SignalRow>(
    `SELECT
       s.id::text,
       COALESCE(c.canonical_name, 'Unidentified company') AS company,
       s.title AS headline,
       s.opportunity_score AS score,
       s.category,
       s.score_explanation,
       s.power_capacity_mw::text,
       s.investment_usd_millions::text,
       COALESCE((s.raw_payload ->> 'demo')::boolean, false) AS is_demo,
       COALESCE(s.published_at, s.imported_at) AS detected_at,
       COALESCE(
         jsonb_agg(
           jsonb_build_object(
             'title', COALESCE(e.label, s.title),
             'url', e.url
           ) ORDER BY e.created_at
         ) FILTER (WHERE e.id IS NOT NULL),
         '[]'::jsonb
       ) AS evidence
     FROM signals s
     LEFT JOIN companies c ON c.id = s.company_id
     LEFT JOIN signal_evidence e ON e.signal_id = s.id
     WHERE s.status = 'pending'
     GROUP BY s.id, c.canonical_name
     ORDER BY s.opportunity_score DESC NULLS LAST, s.imported_at DESC
     LIMIT $1`,
    [safeLimit],
  );
  const now = new Date();

  return result.rows.map((row) => {
    const score = row.score ?? 0;
    const evidence: SignalEvidenceDTO[] = (row.evidence ?? []).map((item) => ({
      title: item.title,
      publisher: publisherFor(item.url),
      url: item.url,
      isDemo: row.is_demo,
    }));
    return {
      id: row.id,
      company: row.company,
      headline: row.headline,
      score,
      confidence: confidenceFor(score),
      type: row.category.charAt(0).toUpperCase() + row.category.slice(1),
      powerCapacityMw: row.power_capacity_mw === null ? null : Number(row.power_capacity_mw),
      investmentUsdMillions: row.investment_usd_millions === null ? null : Number(row.investment_usd_millions),
      detected: formatDetected(row.detected_at),
      age: formatAge(row.detected_at, now),
      why: row.score_explanation ?? "No evidence-based explanation is available yet.",
      evidence,
    };
  });
}
