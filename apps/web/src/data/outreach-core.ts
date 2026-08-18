export type OutreachContext = {
  companyName: string;
  signalTitle: string;
  signalSummary: string;
  opportunityName?: string | null;
  recipientName?: string | null;
  recipientRole?: string | null;
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
  const recipient = context.recipientName?.trim();
  const recipientRole = context.recipientRole?.trim()?.replaceAll("_", " ");

  return {
    subject: `Exploring support for ${company}'s growth plans`,
    body: [
      recipient ? `Hi ${recipient},` : "Hi there,",
      "",
      `I noticed that ${company} ${signalTitle.charAt(0).toLowerCase()}${signalTitle.slice(1)}. ${signalSummary}`,
      "",
      recipientRole
        ? `Given your ${recipientRole} remit, I thought this may be relevant to your planning priorities.`
        : opportunity
        ? `This aligns with the ${opportunity} opportunity our team is evaluating.`
        : "This looks relevant to the infrastructure programs our team supports.",
      "Would a short conversation be useful to compare priorities and timing?",
      "",
      "Best regards,",
    ].join("\n"),
  };
}
