export type OpportunityStage = "identified" | "qualified" | "proposal" | "won" | "lost";

export type OpportunityDTO = {
  id: string;
  accountId: string;
  accountName: string;
  name: string;
  stage: OpportunityStage;
  amountUsd: number | null;
  probability: number | null;
  ownerEmail: string;
  expectedCloseDate: string | null;
  updatedAt: string;
};

export type OpportunityAccountDTO = {
  id: string;
  companyName: string;
};
