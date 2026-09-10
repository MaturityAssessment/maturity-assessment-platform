import test from "node:test";
import assert from "node:assert/strict";
import type { QuestionEvaluationResponse } from "../../../../src/api/types.ts";
import {
  buildAssessmentFeedbackReviewItems,
  getAssessmentReviewCounts,
  isReviewedItemUpdated,
} from "../../../../src/app/assessment/assessmentReviewFeedback.ts";
import type { AssessmentPracticeStep } from "../../../../src/app/assessment/AssessmentStep.tsx";

const evaluations: Record<string, QuestionEvaluationResponse> = {
  accepted: {
    responseKey: "accepted",
    questionId: 1,
    validationStatus: "ACCEPTED",
  },
  adjusted: {
    responseKey: "adjusted",
    questionId: 2,
    validationStatus: "ADJUSTED",
  },
  flaggedSaved: {
    responseKey: "flaggedSaved",
    questionId: 3,
    validationStatus: "FLAGGED",
    respondentUpdated: true,
  },
  flaggedLocal: {
    responseKey: "flaggedLocal",
    questionId: 4,
    validationStatus: "FLAGGED",
  },
};

test("counts only untouched flagged items as outstanding", () => {
  const counts = getAssessmentReviewCounts(
    evaluations,
    new Set(["flaggedLocal"])
  );

  assert.equal(counts.acceptedCount, 1);
  assert.equal(counts.adjustedCount, 1);
  assert.equal(counts.flaggedCount, 2);
  assert.equal(counts.outstandingFlaggedCount, 0);
});

test("recognizes both persisted and local respondent updates", () => {
  assert.equal(
    isReviewedItemUpdated(evaluations.flaggedSaved, new Set()),
    true
  );
  assert.equal(
    isReviewedItemUpdated(
      evaluations.flaggedLocal,
      new Set(["flaggedLocal"])
    ),
    true
  );
  assert.equal(
    isReviewedItemUpdated(evaluations.flaggedLocal, new Set()),
    false
  );
});

test("builds the feedback review in assessment order and excludes accepted items", () => {
  const practiceSteps: AssessmentPracticeStep[] = [
    {
      key: "dimension-one/module-one/practice-one",
      dimension: { id: "d1", name: "Dimension one", modules: [] },
      module: { code: "m1", name: "Module one", practices: [] },
      practice: {
        id: 10,
        code: "p1",
        name: "Practice one",
        questions: [
          {
            id: 101,
            weight: 1,
            text: "Accepted",
            type: "open_answer",
            help: "",
            required: false,
          },
          {
            id: 102,
            weight: 1,
            text: "Flagged",
            type: "open_answer",
            help: "",
            required: false,
          },
        ],
      },
    },
    {
      key: "dimension-two/module-two/practice-two",
      dimension: { id: "d2", name: "Dimension two", modules: [] },
      module: { code: "m2", name: "Module two", practices: [] },
      practice: {
        id: 20,
        code: "p2",
        name: "Practice two",
        questions: [
          {
            id: 201,
            weight: 1,
            text: "Adjusted",
            type: "open_answer",
            help: "",
            required: false,
          },
        ],
      },
    },
  ];
  const orderedEvaluations: Record<string, QuestionEvaluationResponse> = {
    d1_m1_10_101: {
      responseKey: "d1_m1_10_101",
      questionId: 101,
      validationStatus: "ACCEPTED",
    },
    d1_m1_10_102: {
      responseKey: "d1_m1_10_102",
      questionId: 102,
      validationStatus: "FLAGGED",
    },
    d2_m2_20_201: {
      responseKey: "d2_m2_20_201",
      questionId: 201,
      validationStatus: "ADJUSTED",
    },
  };

  const items = buildAssessmentFeedbackReviewItems(
    practiceSteps,
    orderedEvaluations
  );

  assert.deepEqual(
    items.map(({ fieldName }) => fieldName),
    ["d1_m1_10_102", "d2_m2_20_201"]
  );
  assert.deepEqual(
    items.map(({ step }) => step.practice.name),
    ["Practice one", "Practice two"]
  );
});
