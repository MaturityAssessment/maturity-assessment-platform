import test from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_CHAT_CONTEXTS,
  buildAgentContextPrompt,
} from "../../../../src/components/agent-chat/agentChatContexts.ts";

test("maps each supported chat context to an initialization prompt", () => {
  assert.match(AGENT_CHAT_CONTEXTS.dashboard.systemPrompt, /dashboard/i);
  assert.match(AGENT_CHAT_CONTEXTS.assessment.systemPrompt, /assessment/i);
});

test("adds current page details only when they are provided", () => {
  const basePrompt = buildAgentContextPrompt("assessment");
  const contextualPrompt = buildAgentContextPrompt(
    "assessment",
    "  Current item: Describe the evidence-retention process.  "
  );

  assert.equal(basePrompt, AGENT_CHAT_CONTEXTS.assessment.systemPrompt);
  assert.match(contextualPrompt, /Current page context:/);
  assert.match(contextualPrompt, /Describe the evidence-retention process\.$/);
});
