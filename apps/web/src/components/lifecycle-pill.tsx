import type { CommercialLifecycleStage } from "@/types/signal";

const LIFECYCLE_LABELS: Record<CommercialLifecycleStage, string> = {
  new: "New",
  enriched: "Enriched",
  marketing_qualified: "Marketing Qualified",
  sales_accepted: "Sales Accepted",
  opportunity: "Opportunity",
  won: "Won",
  lost: "Lost",
};

export function LifecyclePill({ stage }: { stage: CommercialLifecycleStage }) {
  return <span className={`lifecycle-pill lifecycle-${stage}`}>{LIFECYCLE_LABELS[stage]}</span>;
}

export { LIFECYCLE_LABELS };
