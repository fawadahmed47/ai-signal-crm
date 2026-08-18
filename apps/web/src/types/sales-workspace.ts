import type { CommercialLifecycleStage } from "./signal";

export type DailySalesWorkspaceDTO = {
  priorityAccounts: Array<{ id: string; companyName: string; lifecycleStage: CommercialLifecycleStage; score: number; pipelineValue: number; nextTask: string | null; dueAt: string | null; hasContact: boolean }>;
  overdueTasks: Array<{ id: string; accountId: string; companyName: string; title: string; dueAt: string | null }>;
  summary: { priorityLeads: number; followUpsDue: number; accountsNeedingContact: number; pipelineAtRisk: number };
};
