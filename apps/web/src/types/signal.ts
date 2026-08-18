export type SignalEvidenceDTO = {
  title: string;
  publisher: string;
  url: string;
  isDemo?: boolean;
};

export type CommercialLifecycleStage =
  | "new"
  | "enriched"
  | "marketing_qualified"
  | "sales_accepted"
  | "opportunity"
  | "won"
  | "lost";

export type SignalInboxDTO = {
  id: string;
  company: string;
  headline: string;
  score: number;
  confidence: "High" | "Medium" | "Low";
  type: string;
  powerCapacityMw: number | null;
  investmentUsdMillions: number | null;
  location: string | null;
  detected: string;
  age: string;
  why: string;
  evidence: SignalEvidenceDTO[];
  lifecycleStage: CommercialLifecycleStage;
};
