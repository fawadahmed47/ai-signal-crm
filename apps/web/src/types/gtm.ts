export type CampaignDTO = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  ownerEmail: string;
  members: number;
  contacted: number;
  replies: number;
  meetings: number;
};

export type EnrichmentItemDTO = {
  accountId: string;
  companyName: string;
  website: string | null;
  countryCode: string | null;
  hasDecisionMaker: boolean;
  hasEvidence: boolean;
  score: number;
  missing: string[];
};

export type RoutingSuggestionDTO = {
  accountId: string;
  companyName: string;
  signalId: string | null;
  score: number;
  investmentUsdMillions: number | null;
  suggestedOwner: string;
  ruleName: string;
  rationale: string;
  routedAt: string | null;
};

export type GtmWorkspaceDTO = {
  campaigns: CampaignDTO[];
  availableAccounts: Array<{ id: string; companyName: string; score: number; lifecycleStage: string }>;
  enrichment: EnrichmentItemDTO[];
  routing: RoutingSuggestionDTO[];
};
