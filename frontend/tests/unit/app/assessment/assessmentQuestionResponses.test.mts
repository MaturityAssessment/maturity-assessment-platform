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


test("multiple selection preserves option indexes and explicit none through save and hydration", () => {
  const selectionStep: AssessmentPracticeStep = {
    ...step,
    practice: {
      ...step.practice,
      questions: [{ ...step.practice.questions[0], type: "multiple_selection" }],
    },
  };
  for (const selected of [[0, 2], []]) {
    const responses = collectQuestionResponses([selectionStep], { D1_M1_10_100: selected });
    assert.deepEqual(responses.D1_M1_10_100.response, selected);
    assert.deepEqual(hydrateQuestionResponses({ D1_M1_10_100: {
      responseKey: "D1_M1_10_100", questionId: 100, response: selected, initialScore: null,
    }}), { D1_M1_10_100: selected });
  }
  assert.deepEqual(collectQuestionResponses([selectionStep], {}), {});
});


test("multiple selection validates indexes and formats selected labels", async () => {
  const { isQuestionResponseValid, isQuestionComplete } = await import("../../../../src/app/assessment/assessmentFlowUtils.ts");
  const { formatQuestionResponseValue } = await import("../../../../src/app/assessment/evaluation/evaluationModel.ts");
  const question = {
    ...step.practice.questions[0], type: "multiple_selection" as const,
    choices: [
      { label: "Policy", score: 0, rawValue: 2 },
      { label: "Training", score: 0, rawValue: 2 },
    ],
  };
  assert.equal(isQuestionResponseValid(question, [0, 1]), true);
  for (const invalid of [0.5, [0, 0], [-1], [2], [0.5], ["0"]]) {
    assert.equal(isQuestionResponseValid(question, invalid), false);
  }
  assert.equal(isQuestionComplete([]), true);
  assert.equal(isQuestionComplete(undefined), false);
  assert.equal(formatQuestionResponseValue(question, [0, 1], []), "Policy; Training");
  assert.equal(formatQuestionResponseValue(question, [], []), "None of the above");
});


test("single-choice identity survives saving and hydration without changing equal scores", () => {
  const choiceStep = { ...step, practice: { ...step.practice, questions: [{ ...step.practice.questions[0],
    type: "multiple_choice" as const, choices: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }, { label: "Not Applicable", score: 1 }] }] } };
  for (const choiceIndex of [0, 2]) {
    const formData = { D1_M1_10_100: `choice:${choiceIndex}` };
    const responses = collectQuestionResponses([choiceStep], formData);
    assert.deepEqual(responses.D1_M1_10_100, { questionId: 100, response: 1, choiceIndex });
    assert.deepEqual(hydrateQuestionResponses({ answer: { responseKey: "D1_M1_10_100", ...responses.D1_M1_10_100 } }), formData);
  }
  assert.deepEqual(collectQuestionResponses([choiceStep], { D1_M1_10_100: 1 }).D1_M1_10_100,
    { questionId: 100, response: 1 });
});


test("review labels distinguish single-choice options with the same score", async () => {
  const { formatQuestionResponseValue } = await import("../../../../src/app/assessment/evaluation/evaluationModel.ts");
  const question = { ...step.practice.questions[0], type: "multiple_choice" as const,
    choices: [{ label: "Yes", score: 1 }, { label: "Not Applicable", score: 1 }] };
  assert.equal(formatQuestionResponseValue(question, "choice:0", []), "Yes");
  assert.equal(formatQuestionResponseValue(question, "choice:1", []), "Not Applicable");
});

test("choice and scale dependencies preserve matching answers and prune nonmatching descendants", async () => {
  const { pruneDisabledQuestionData, getAssessmentPracticeProgress } = await import("../../../../src/app/assessment/assessmentFlowUtils.ts");
  const configured: AssessmentPracticeStep = structuredClone(step);
  const [parent, child, grandchild] = configured.practice.questions;
  parent.type = "multiple_choice";
  parent.choices = [{ id: "a", label: "A", score: 0 }, { id: "b", label: "B", score: 0 }, { id: "c", label: "C", score: 1 }];
  child.type = "likert"; child.dependsOnQuestionId = parent.id; child.required = true;
  child.dependencyCondition = { type: "multiple_choice", optionIds: ["a", "b"] };
  grandchild.dependsOnQuestionId = child.id; grandchild.dependencyCondition = { type: "likert", points: [3, 4] };
  const answers = { D1_M1_10_100: "choice:0", D1_M1_10_101: 3, D1_M1_10_102: 4 };
  assert.equal(Object.keys(collectQuestionResponses([configured], answers)).length, 3);
  assert.equal(pruneDisabledQuestionData([configured], { ...answers, D1_M1_10_100: "choice:1" }).removedFields.size, 0);
  const pruned = pruneDisabledQuestionData([configured], { ...answers, D1_M1_10_100: "choice:2" });
  assert.equal(pruned.removedFields.size, 2);
  assert.equal(getAssessmentPracticeProgress(configured, pruned.formData, new Map()).totalEnabledQuestions, 1);
  assert.equal(Object.keys(collectQuestionResponses([configured], { ...answers, D1_M1_10_100: "choice:2" })).length, 1);
});
