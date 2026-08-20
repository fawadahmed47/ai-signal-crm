import "server-only";

import { getDatabasePool } from "@/data/db";
import type { SignalEvidenceDTO, SignalInboxDTO } from "@/types/signal";
import type { CommercialLifecycleStage } from "@/types/signal";

type SignalRow = {
  id: string;
  company: string | null;
  headline: string;
  score: number | null;
  category: string;
  score_explanation: string | null;
  power_capacity_mw: string | null;
  investment_usd_millions: string | null;
  location_text: string | null;
  is_demo: boolean;
  detected_at: Date;
  evidence: Array<{ title: string; url: string }> | null;
  lifecycle_stage: CommercialLifecycleStage;
  score_components: Record<string, number> | null;
};

const COMPANY_ACTION_PATTERN = /^([A-Z][\p{L}\p{N}&.'’\-]*(?:\s+(?:[A-Z][\p{L}\p{N}&.'’\-]*|and|&)){0,5}?)\s+(?:seeks|raises|establishes|plans|completes|unveils|reveals|secures|signs|starts|announces|acquires|opens|builds|breaks\s+ground|withdraws|plots|uses|use|occupied|rumored)/iu;
const POSSESSIVE_COMPANY_PATTERN = /^([A-Z][\p{L}\p{N}&.'’\-]*)['’]s\s+/u;
const GENERIC_COMPANY_LABELS = new Set([
  "plans", "new", "data", "state", "twenty", "enterprise", "efficiency", "riding", "is", "the", "a", "an", "norwegian developer", "state owned real estate group",
]);

function companySuggestedByHeadline(headline: string): string | null {
  const source = headline.trim();
  const possessive = source.match(POSSESSIVE_COMPANY_PATTERN)?.[1];
  const candidate = possessive ?? source.match(COMPANY_ACTION_PATTERN)?.[1];
  if (!candidate) return null;
  const cleaned = candidate.replace(/[\s\-–—]+$/u, "").trim();
  if (!cleaned || GENERIC_COMPANY_LABELS.has(cleaned.toLowerCase())) return null;
  return cleaned;
}

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
       c.canonical_name AS company,
       s.title AS headline,
       s.opportunity_score AS score,
       s.category,
       s.score_explanation,
       s.power_capacity_mw::text,
       s.investment_usd_millions::text,
       s.location_text,
       s.lifecycle_stage,
       s.raw_payload -> 'score_components' AS score_components,
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
    const confirmedCompany = row.company?.trim() || null;
    const suggestedCompany = confirmedCompany ? null : companySuggestedByHeadline(row.headline);
    const evidence: SignalEvidenceDTO[] = (row.evidence ?? []).map((item) => ({
      title: item.title,
      publisher: publisherFor(item.url),
      url: item.url,
      isDemo: row.is_demo,
    }));
    return {
      id: row.id,
      company: confirmedCompany ?? suggestedCompany ?? "Company verification needed",
      companyMatch: confirmedCompany ? "matched" : suggestedCompany ? "suggested" : "needs_verification",
      headline: row.headline,
      score,
      confidence: confidenceFor(score),
      type: row.category.charAt(0).toUpperCase() + row.category.slice(1),
      powerCapacityMw: row.power_capacity_mw === null ? null : Number(row.power_capacity_mw),
      investmentUsdMillions: row.investment_usd_millions === null ? null : Number(row.investment_usd_millions),
      location: row.location_text,
      detected: formatDetected(row.detected_at),
      age: formatAge(row.detected_at, now),
      why: row.score_explanation ?? "No evidence-based explanation is available yet.",
      evidence,
      lifecycleStage: row.lifecycle_stage,
      scoreBreakdown: {
        category: Number(row.score_components?.category ?? 0),
        investment: Number(row.score_components?.investment ?? 0),
        powerCapacity: Number(row.score_components?.power_capacity ?? 0),
        evidence: Number(row.score_components?.evidence_completeness ?? 0),
      },
    };
  });
}
