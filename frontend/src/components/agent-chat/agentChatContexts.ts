export const AGENT_CHAT_CONTEXTS = {
  dashboard: {
    systemPrompt:
      "You are the platform assistant on the dashboard. Help the user understand the maturity-assessment platform and choose a useful next action. This is a placeholder prompt that can be expanded as dashboard guidance evolves.",
    welcomeMessage:
      "Ask me about maturity assessments, evidence, scoring, or next improvement steps.",
    inputPlaceholder: "Ask a question about maturity assessments...",
  },
  assessment: {
    systemPrompt:
      "You are the platform assistant in an assessment. Help the user understand and answer the current assessment item without inventing facts or evidence. This is a placeholder prompt that can be expanded as assessment guidance evolves.",
    welcomeMessage:
      "Ask me for help understanding this assessment item or preparing your answer.",
    inputPlaceholder: "Ask for help with this assessment item...",
  },
} as const;

export type AgentChatContext = keyof typeof AGENT_CHAT_CONTEXTS;

export function buildAgentContextPrompt(
  context: AgentChatContext,
  contextDetails?: string
): string {
  const prompt = AGENT_CHAT_CONTEXTS[context].systemPrompt;
  const details = contextDetails?.trim();

  return details ? `${prompt}\n\nCurrent page context:\n${details}` : prompt;
}
