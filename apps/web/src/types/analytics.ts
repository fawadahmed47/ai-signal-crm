export type AnalyticsSummaryDTO = {
  totalSignals: number;
  approvalRate: number;
  totalAccounts: number;
  openPipelineValue: number;
  wonRevenue: number;
};

export type AnalyticsBreakdownDTO = {
  label: string;
  count: number;
  value?: number;
};

export type AnalyticsTrendDTO = {
  label: string;
  imported: number;
  approved: number;
};

export type AnalyticsReportDTO = {
  summary: AnalyticsSummaryDTO;
  signalStatuses: AnalyticsBreakdownDTO[];
  signalCategories: AnalyticsBreakdownDTO[];
  pipelineStages: AnalyticsBreakdownDTO[];
  taskHealth: AnalyticsBreakdownDTO[];
  weeklyTrend: AnalyticsTrendDTO[];
  sourcePerformance: Array<{ source: string; imported: number; approved: number; approvalRate: number; pipelineValue: number }>;
  reviewerPerformance: Array<{ reviewer: string; reviewed: number; approved: number; approvalRate: number }>;
  dataQuality: {
    missingCompanyFields: number;
    missingContactFields: number;
    lowConfidenceLeads: number;
    missingOrBrokenEvidence: number;
    correctionsWaitingReview: number;
  };
  generatedAt: string;
};
