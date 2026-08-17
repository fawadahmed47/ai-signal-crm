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
  generatedAt: string;
};
