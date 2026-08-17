export type OutreachContext = {
  companyName: string;
  signalTitle: string;
  signalSummary: string;
  opportunityName?: string | null;
};

export type OutreachCopy = { subject: string; body: string };

function clean(value: string, label: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

export function composeOutreachDraft(context: OutreachContext): OutreachCopy {
  const company = clean(context.companyName, "Company name");
  const signalTitle = clean(context.signalTitle, "Signal title");
  const signalSummary = clean(context.signalSummary, "Signal summary");
  const opportunity = context.opportunityName?.trim();

  return {
    subject: `Exploring support for ${company}'s growth plans`,
    body: [
      "Hi there,",
      "",
      `I noticed that ${company} ${signalTitle.charAt(0).toLowerCase()}${signalTitle.slice(1)}. ${signalSummary}`,
      "",
      opportunity
        ? `This aligns with the ${opportunity} opportunity our team is evaluating.`
        : "This looks relevant to the infrastructure programs our team supports.",
      "Would a short conversation be useful to compare priorities and timing?",
      "",
      "Best regards,",
    ].join("\n"),
  };
}
