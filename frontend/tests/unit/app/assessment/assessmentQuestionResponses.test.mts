import test from "node:test";
import assert from "node:assert/strict";
import type { AssessmentPracticeStep } from "../../../../src/app/assessment/AssessmentStep.tsx";
import {
  collectQuestionResponses,
  hydrateQuestionResponses,
} from "../../../../src/app/assessment/assessmentQuestionResponses.ts";

const step: AssessmentPracticeStep = {
  key: "practice-10",
  dimension: {
    id: "D1",
    name: "Governance",
    modules: [],
  },
  module: {
    code: "M1",
    name: "Policy",
    practices: [],
  },
  practice: {
    id: 10,
    name: "Policy management",
    questions: [
      {
        id: 100,
        weight: 1,
        text: "Is the policy approved?",
        type: "boolean",
        help: "",
      },
      {
        id: 101,
        weight: 1,
        text: "Describe the policy.",
        type: "open_answer",
        help: "",
      },
      {
        id: 102,
        weight: 1,
        text: "Dependent answer",
        type: "likert",
        help: "",
        dependsOnQuestionId: 100,
      },
    ],
  },
};

test("serializes response-keyed objects and preserves zero answers", () => {
  const responses = collectQuestionResponses([step], {
    D1_M1_10_100: 0,
    D1_M1_10_101: "Documented annually",
    D1_M1_10_101_justification: "Policy register",
    D1_M1_10_102: 4,
  });

  assert.deepEqual(responses, {
    D1_M1_10_100: {
      questionId: 100,
      response: 0,
    },
    D1_M1_10_101: {
      questionId: 101,
      response: "Documented annually",
      respondentJustification: "Policy register",
    },
  });
});

test("hydrates answers and respondent justifications from evaluation rows", () => {
  assert.deepEqual(
    hydrateQuestionResponses({
      D1_M1_10_100: {
        responseKey: "D1_M1_10_100",
        questionId: 100,
        response: 0,
        initialScore: null,
      },
      D1_M1_10_101: {
        responseKey: "D1_M1_10_101",
        questionId: 101,
        response: "Documented annually",
        respondentJustification: "Policy register",
      },
    }),
    {
      D1_M1_10_100: 0,
      D1_M1_10_101: "Documented annually",
      D1_M1_10_101_justification: "Policy register",
    }
  );
});
