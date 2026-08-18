import type { OpportunityStage } from "./opportunity";
import type { CommercialLifecycleStage } from "./signal";

export type AccountListDTO = {
  id: string;
  companyName: string;
  website: string | null;
  countryCode: string | null;
  ownerEmail: string;
  lifecycleStage: CommercialLifecycleStage;
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
  lifecycleStage: CommercialLifecycleStage;
  createdAt: string;
  originatingSignalId: string | null;
  signals: Array<{
    id: string;
    title: string;
    category: string;
    summary: string;
    status: string;
    lifecycleStage: CommercialLifecycleStage;
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
  outreachDrafts: Array<{
    id: string;
    subject: string;
    body: string;
    status: "draft" | "archived";
    generatedByEmail: string;
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    assigneeEmail: string;
    status: "open" | "in_progress" | "completed" | "cancelled";
    dueAt: string | null;
  }>;
  contacts: Array<{ id: string; fullName: string; jobTitle: string | null; email: string | null; phone: string | null; createdAt: string }>;
  notes: Array<{ id: string; body: string; authorName: string; createdAt: string }>;
};
