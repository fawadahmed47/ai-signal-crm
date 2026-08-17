export type SignalEvidenceDTO = {
  title: string;
  publisher: string;
  url: string;
};

export type SignalInboxDTO = {
  id: string;
  company: string;
  headline: string;
  score: number;
  confidence: "High" | "Medium" | "Low";
  type: string;
  detected: string;
  age: string;
  why: string;
  evidence: SignalEvidenceDTO[];
};
