import test from "node:test";
import assert from "node:assert/strict";
import type {
  AssessmentResponse,
  MaturityModel,
  Question,
} from "../../../../src/api/types.ts";
import type { AssessmentPracticeStep } from "../../../../src/app/assessment/AssessmentStep.tsx";
import { buildAssessmentResultMetrics } from "../../../../src/app/assessment/assessmentResults.ts";
import {
  buildAssessmentResultsExportData,
  getAssessmentExportFileName,
} from "../../../../src/app/assessment/assessmentResultsExport.ts";

const levels = [
  { number: 1, name: "Initial" },
  { number: 2, name: "Repeatable" },
  { number: 3, name: "Managed" },
  { number: 4, name: "Measured" },
  { number: 5, name: "Optimised" },
];

function makeStep(
  dimensionId: string,
  dimensionName: string,
  questionId: number,
  questionType: Question["type"] = "likert"
): AssessmentPracticeStep {
  const question: Question = {
    id: questionId,
    code: `Q${questionId}`,
    weight: 1,
    text: `Question ${questionId}`,
    type: questionType,
    help: "",
  };
  const practice = {
    id: questionId,
    code: `P${questionId}`,
    name: `Practice ${questionId}`,
    questions: [question],
  };
  const module = {
    code: `M${questionId}`,
    name: `Module ${questionId}`,
    practices: [practice],
  };
  const dimension = {
    id: dimensionId,
    name: dimensionName,
    modules: [module],
  };
  return {
    key: `practice-${questionId}`,
    dimension,
    module,
    practice,
  };
}

const steps = [
  makeStep("D1", "Governance", 101),
  makeStep("D1", "Governance", 102),
  makeStep("D2", "Operations", 201),
  makeStep("D3", "People", 301, "open_answer"),
];
const model: MaturityModel = {
  id: 1,
  name: "Resilience",
  description: "Assessment model",
  isActive: true,
  levels,
  dimensions: [
    steps[0].dimension,
    steps[2].dimension,
    steps[3].dimension,
  ],
};
const assessment: AssessmentResponse = {
  id: 44,
  overallAverage: 3,
  overallMaturityLevel: "Managed",
  isCompleted: true,
  status: "COMPLETED",
  createdAt: "2026-07-01T10:00:00",
  dimensionResults: [
    {
      dimensionId: "D3",
      dimensionName: "People",
      averageScore: 4,
      maturityLevel: "Measured",
      totalQuestions: 1,
      totalScore: 4,
    },
    {
      dimensionId: "D1",
      dimensionName: "Governance",
      averageScore: 3,
      maturityLevel: "Managed",
      totalQuestions: 2,
      totalScore: 6,
    },
    {
      dimensionId: "D2",
      dimensionName: "Operations",
      averageScore: 2,
      maturityLevel: "Repeatable",
      totalQuestions: 1,
      totalScore: 2,
    },
  ],
  questionEvaluations: {
    D2_M201_201_201: {
      responseKey: "D2_M201_201_201",
      questionId: 201,
      validationStatus: "ADJUSTED",
      initialScore: 4,
      manualScore: 3,
      reviewerNote: "Operational evidence supports a lower score.",
    },
    D1_M101_101_101: {
      responseKey: "D1_M101_101_101",
      questionId: 101,
      validationStatus: "ACCEPTED",
      initialScore: 2,
    },
    D3_M301_301_301: {
      responseKey: "D3_M301_301_301",
      questionId: 301,
      validationStatus: "ACCEPTED",
      initialScore: null,
      manualScore: 5,
    },
    D1_M102_102_102: {
      responseKey: "D1_M102_102_102",
      questionId: 102,
      validationStatus: "ADJUSTED",
      initialScore: 2,
      manualScore: 4,
      reviewerNote: "The submitted evidence supports a higher score.",
    },
  },
};

test("derives ordered dimensions and the final item score distribution", () => {
  const metrics = buildAssessmentResultMetrics(assessment, model, steps);

  assert.equal(metrics.finalLevelNumber, 3);
  assert.deepEqual(
    metrics.dimensions.map(({ dimensionId }) => dimensionId),
    ["D1", "D2", "D3"]
  );
  assert.deepEqual(
    metrics.scoreDistribution.map(({ count }) => count),
    [0, 1, 1, 1, 1]
  );
  assert.equal(metrics.scoredQuestionCount, 4);
  assert.equal(metrics.belowFinalLevelCount, 1);
});

test("compares only adjusted items with both automatic and revised scores", () => {
  const metrics = buildAssessmentResultMetrics(assessment, model, steps);

  assert.equal(metrics.adjustedItemCount, 2);
  assert.equal(metrics.raisedItemCount, 1);
  assert.equal(metrics.loweredItemCount, 1);
  assert.equal(metrics.totalAdjustmentDelta, 1);
  assert.deepEqual(
    metrics.adjustments.map(({ dimensionId, delta }) => [
      dimensionId,
      delta,
    ]),
    [
      ["D1", 2],
      ["D2", -1],
    ]
  );
});

test("orders evaluator notes by their original assessment position", () => {
  const metrics = buildAssessmentResultMetrics(assessment, model, steps);

  assert.deepEqual(
    metrics.evaluatorNotes.map(({ responseKey }) => responseKey),
    ["D1_M102_102_102", "D2_M201_201_201"]
  );
});

test("builds a results export with readable answers and review context", () => {
  const exportData = buildAssessmentResultsExportData(
    {
      ...assessment,
      maturityModelVersion: 2,
      domainName: "Technology",
      evaluatorInsight: "Prioritise operational controls.",
      questionEvaluations: {
        ...assessment.questionEvaluations,
        D1_M101_101_101: {
          ...assessment.questionEvaluations!.D1_M101_101_101,
          response: 1,
          respondentJustification: "The control is in place.",
        },
      },
      evidence: [
        {
          id: 8,
          assessmentId: 44,
          questionId: 101,
          description: "Control policy",
          evidenceType: "FILE",
          fileName: "policy.pdf",
          createdAt: "2026-07-01T09:00:00",
        },
      ],
    },
    model,
    steps
  );

  assert.equal(exportData.modelName, "Resilience");
  assert.equal(exportData.modelVersion, 2);
  assert.equal(exportData.domainName, "Technology");
  assert.equal(exportData.answers.length, 4);
  assert.deepEqual(
    {
      answer: exportData.answers[0].answer,
      justification: exportData.answers[0].respondentJustification,
      evidence: exportData.answers[0].evidence,
      finalScore: exportData.answers[0].finalScore,
      status: exportData.answers[0].reviewStatus,
    },
    {
    answer: "Point 1 of 5",
      justification: "The control is in place.",
      evidence: "policy.pdf — Control policy",
      finalScore: 2,
      status: "accepted",
    }
  );
  assert.equal(exportData.answers[1].evaluatorNote, "The submitted evidence supports a higher score.");
});

test("creates filesystem-safe export filenames", () => {
  assert.equal(
    getAssessmentExportFileName(
      { modelName: "Resiliência & Controls", assessmentId: 44 },
      "xlsx"
    ),
    "resiliencia-controls-assessment-44-results.xlsx"
  );
});
