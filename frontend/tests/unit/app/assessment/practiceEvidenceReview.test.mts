import test from "node:test";
import assert from "node:assert/strict";
import type { Evidence, MaturityModel } from "../../../../src/api/types.ts";
import { buildEvaluationModel } from "../../../../src/app/evaluate/[id]/evaluationModel.ts";

const model: MaturityModel = {
  id: 1, name: "Model", description: "", isActive: true,
  dimensions: [{
    id: "D", name: "Dimension", modules: [{
      code: "M", name: "Module", practices: [{
        id: 10, name: "Practice", requiresEvidence: true,
        questions: [
          { id: 100, weight: 1, text: "Answered", type: "boolean", help: "" },
          { id: 101, weight: 1, text: "Unanswered", type: "boolean", help: "" },
        ],
      }],
    }],
  }],
};
const evidence: Evidence = {
  id: 7, assessmentId: 2, practiceId: 10, description: "Policy",
  evidenceType: "URL", url: "https://example.com/policy", createdAt: "",
};
const assessment = {
  id: 2, overallAverage: 0, overallMaturityLevel: "Draft", isCompleted: false, createdAt: "",
};

test("review groups evidence once per practice without adding unanswered questions", () => {
  const result = buildEvaluationModel({
    ...assessment, questionEvaluations: {
      D_M_10_100: { questionId: 100, responseKey: "D_M_10_100", response: 1 },
    },
  }, model, [evidence]);
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].questionId, 100);
  assert.deepEqual(result.dimensions[0].groups[0].evidence, [evidence]);
});

test("practice evidence stays visible when no question has an answer", () => {
  const result = buildEvaluationModel(assessment, model, [evidence]);
  assert.equal(result.questions.length, 0);
  assert.deepEqual(result.dimensions[0].groups[0].evidence, [evidence]);
});
