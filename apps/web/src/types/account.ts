import type { OpportunityStage } from "./opportunity";

export type AccountListDTO = {
  id: string;
  companyName: string;
  website: string | null;
  countryCode: string | null;
  ownerEmail: string;
  lifecycleStage: string;
  opportunityCount: number;
  pipelineValue: number;
  latestSignalAt: string | null;
};

export type AccountIntelligenceDTO = {
  id: string;
  company: {
    name: string;
    website: string | null;
    countryCode: string | null;
  };
  ownerEmail: string;
  lifecycleStage: string;
  createdAt: string;
  originatingSignalId: string | null;
  signals: Array<{
    id: string;
    title: string;
    category: string;
    summary: string;
    status: string;
    score: number | null;
    explanation: string | null;
    occurredAt: string | null;
    evidence: Array<{ title: string; url: string }>;
  }>;
  opportunities: Array<{
    id: string;
    name: string;
    stage: OpportunityStage;
    amountUsd: number | null;
    probability: number | null;
    expectedCloseDate: string | null;
  }>;
  activities: Array<{
    id: string;
    eventType: string;
    actorEmail: string;
    details: Record<string, unknown>;
    occurredAt: string;
  }>;
};
