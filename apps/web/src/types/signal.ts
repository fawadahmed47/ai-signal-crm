export type SignalEvidenceDTO = {
  title: string;
  publisher: string;
  url: string;
  isDemo?: boolean;
};

export type SignalInboxDTO = {
  id: string;
  company: string;
  headline: string;
  score: number;
  confidence: "High" | "Medium" | "Low";
  type: string;
  powerCapacityMw: number | null;
  investmentUsdMillions: number | null;
  detected: string;
  age: string;
  why: string;
  evidence: SignalEvidenceDTO[];
};
