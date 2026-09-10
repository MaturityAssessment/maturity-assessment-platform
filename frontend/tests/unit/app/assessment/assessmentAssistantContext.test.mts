import test from "node:test";
import assert from "node:assert/strict";
import type { Question } from "../../../../src/api/types.ts";
import { buildAssessmentAssistantContext } from "../../../../src/app/assessment/assessmentAssistantContext.ts";

const question: Question = {
  id: 21,
  weight: 1,
  text: "How consistently is evidence retained?",
  type: "multiple_choice",
  help: "Consider the documented retention schedule.",
  required: true,
  requiresEvidence: true,
  choices: [
    { label: "Ad hoc", score: 0 },
    { label: "Documented", score: 1 },
  ],
};

test("builds item-specific assistant context without a draft response", () => {
  const context = buildAssessmentAssistantContext({
    modelName: "Security maturity",
    dimensionName: "Governance",
    moduleName: "Evidence",
    practiceName: "Retention",
    practiceDescription: "Keep evidence for the required period.",
    question,
    modelMaxLevel: 5,
    evaluation: {
      responseKey: "question_21",
      questionId: 21,
      reviewerNote: "Clarify which schedule is followed.",
    },
  });

  assert.match(context, /Governance > Evidence > Retention/);
  assert.match(context, /How consistently is evidence retained\?/);
  assert.match(context, /One of: Ad hoc; Documented/);
  assert.match(context, /Clarify which schedule is followed\./);
  assert.match(context, /draft response and uploaded evidence have not been shared/i);
});
