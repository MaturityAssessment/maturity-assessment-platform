import assert from "node:assert/strict";
import test from "node:test";
import type {
  Question,
  QuestionEvaluationResponse,
} from "../../../../src/api/types.ts";
import {
  buildQuestionCardFeedback,
  getQuestionCardStatus,
  getQuestionInstruction,
} from "../../../../src/app/assessment/assessmentQuestionCardModel.ts";

const baseQuestion: Question = {
  id: 1,
  weight: 1,
  text: "Question",
  type: "boolean",
  help: "",
};

test("maps instructions and card statuses without coupling presentation to question type", () => {
  const instructions = new Map<Question["type"], string>([
    ["boolean", "Yes or no"],
    ["likert", "Choose a point on the scale"],
    ["multiple_selection", "Select all that apply"],
    ["multiple_choice", "Select one"],
    ["numeric", "Enter a number"],
    ["percentage", "Enter a percentage"],
    ["open_answer", "Written response"],
  ]);
  instructions.forEach((instruction, type) => {
    assert.equal(getQuestionInstruction({ ...baseQuestion, type }), instruction);
  });

  const evaluation = (
    validationStatus: QuestionEvaluationResponse["validationStatus"]
  ): QuestionEvaluationResponse => ({
    responseKey: "D_M_1_1",
    questionId: 1,
    validationStatus,
  });
  assert.equal(
    getQuestionCardStatus({
      disabled: true,
      complete: true,
      evaluation: evaluation("ACCEPTED"),
      respondentUpdated: false,
    }),
    "disabled"
  );
  assert.equal(
    getQuestionCardStatus({
      disabled: false,
      complete: false,
      evaluation: evaluation("ACCEPTED"),
      respondentUpdated: false,
    }),
    "accepted"
  );
  assert.equal(
    getQuestionCardStatus({
      disabled: false,
      complete: true,
      evaluation: evaluation("FLAGGED"),
      respondentUpdated: false,
    }),
    "flagged"
  );
  assert.equal(
    getQuestionCardStatus({
      disabled: false,
      complete: true,
      evaluation: evaluation("FLAGGED"),
      respondentUpdated: true,
    }),
    "flagged-updated"
  );
  assert.equal(
    getQuestionCardStatus({
      disabled: false,
      complete: true,
      evaluation: evaluation("ADJUSTED"),
      respondentUpdated: false,
    }),
    "adjusted"
  );
  assert.equal(
    getQuestionCardStatus({
      disabled: false,
      complete: true,
      respondentUpdated: false,
    }),
    "complete"
  );
});

test("normalizes evaluator feedback for the dumb card", () => {
  assert.deepEqual(
    buildQuestionCardFeedback(
      baseQuestion,
      {
        responseKey: "D_M_1_1",
        questionId: 1,
        validationStatus: "ACCEPTED",
        reviewerNote: "Supported by evidence",
      },
      false
    ),
    {
      tone: "accepted",
      title: "Accepted by evaluator",
      note: "Supported by evidence",
      readOnly: true,
    }
  );
  assert.equal(
    buildQuestionCardFeedback(
      baseQuestion,
      {
        responseKey: "D_M_1_1",
        questionId: 1,
        validationStatus: "FLAGGED",
      },
      false
    )?.prompt,
    "Update this answer or the shared practice evidence to mark it ready for review."
  );
  assert.equal(
    buildQuestionCardFeedback(
      baseQuestion,
      {
        responseKey: "D_M_1_1",
        questionId: 1,
        validationStatus: "ADJUSTED",
        manualScore: 1,
      },
      false
    )?.result,
    "Evaluator result: Correct"
  );
});
