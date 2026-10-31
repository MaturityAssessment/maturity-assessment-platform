import test from "node:test";
import assert from "node:assert/strict";
import type {
  AssessmentData,
  MaturityModel,
} from "../../../../src/api/types.ts";
import type { AssessmentPracticeStep } from "../../../../src/app/assessment/AssessmentStep.tsx";
import {
  buildAssessmentDashboardSummary,
  findDimensionEntryPractice,
  formatAssessmentTitle,
  getAssessmentJourneyStage,
} from "../../../../src/app/assessment/assessmentDashboard.ts";

const questionOne = {
  id: 100,
  code: "Q1",
  weight: 1,
  text: "Is the control implemented?",
  type: "boolean" as const,
  help: "",
  required: true,
};
const evidenceQuestion = {
  id: 101,
  code: "Q2",
  weight: 1,
  text: "Is evidence available?",
  type: "boolean" as const,
  help: "",
  required: true,
};
const dependentQuestion = {
  id: 102,
  code: "Q3",
  weight: 1,
  text: "Is the dependent control implemented?",
  type: "boolean" as const,
  help: "",
  dependsOnQuestionId: questionOne.id,
};
const practice = {
  requiresEvidence: true,
  id: 10,
  code: "P1",
  name: "Control practice",
  questions: [questionOne, evidenceQuestion, dependentQuestion],
};
const module = {
  code: "M1",
  name: "Control module",
  practices: [practice],
};
const dimension = {
  id: "D1",
  name: "Governance",
  description: "Policies and responsibilities",
  modules: [module],
};
const model: MaturityModel = {
  id: 1,
  name: "Cybersecurity",
  description: "Security assessment",
  isActive: true,
  dimensions: [dimension],
};
const steps: AssessmentPracticeStep[] = [
  {
    key: "practice-10",
    dimension,
    module,
    practice,
  },
];
const emptyEvidence = new Map();
const suppliedEvidence = new Map([
  [
    "practice_10_evidence",
    [
      {
        id: "evidence-link",
        practiceId: evidenceQuestion.id,
        type: "link" as const,
        description: "",
        file: null,
        url: "https://example.com/evidence",
      },
    ],
  ],
]);

test("starts with unanswered enabled questions and excludes inactive dependencies", () => {
  const summary = buildAssessmentDashboardSummary(
    model,
    steps,
    {},
    emptyEvidence
  );

  assert.equal(summary.totalCount, 2);
  assert.equal(summary.answeredCount, 0);
  assert.equal(summary.unansweredCount, 2);
  assert.equal(summary.progressPercentage, 0);
  assert.equal(summary.dimensions[0].practiceCount, 1);
  assert.equal(summary.dimensions[0].requiredComplete, false);
  assert.equal(summary.dimensions[0].optionalUnansweredCount, 0);
  assert.equal(summary.dimensions[0].status, "not-started");
  assert.equal(summary.missingRequiredAnswerCount, 0);
  assert.equal(summary.dimensions[0].missingRequiredAnswerCount, 2);
  assert.equal(summary.missingEvidenceCount, 0);
  assert.equal(summary.dimensions[0].missingEvidenceCount, 0);
});

test("overall warnings include only started dimensions and update as work begins", () => {
  const optionalPractice = {
    ...practice,
    id: 20,
    questions: [{ ...questionOne, required: false }],
  };
  const optionalModule = { ...module, practices: [optionalPractice] };
  const untouchedDimension = {
    ...dimension,
    id: "D2",
    modules: [optionalModule],
  };
  const allSteps = [...steps, {
    key: "practice-20",
    dimension: untouchedDimension,
    module: optionalModule,
    practice: optionalPractice,
  }];
  const twoDimensions = { ...model, dimensions: [dimension, untouchedDimension] };
  const data: AssessmentData = { D1_M1_10_100: 0 };
  const summary = buildAssessmentDashboardSummary(twoDimensions, allSteps, data, emptyEvidence);
  assert.equal(summary.dimensions[0].status, "in-progress");
  assert.equal(summary.dimensions[1].status, "not-started");
  assert.equal(summary.dimensions[1].missingEvidenceCount, 1);
  assert.equal(summary.missingEvidenceCount, 0);
  assert.equal(summary.missingRequiredAnswerCount, 1);

  const started = buildAssessmentDashboardSummary(twoDimensions, allSteps,
    { ...data, D2_M1_20_100: 0 }, emptyEvidence);
  assert.equal(started.dimensions[1].status, "in-progress");
  assert.equal(started.missingEvidenceCount, 1);
  assert.equal(started.missingRequiredAnswerCount, 1);
});

test("dashboard counts evidence blockers only for practices whose required answers are ready", () => {
  const secondPractice = { ...practice, id: 20, code: "P2", name: "Second practice" };
  const secondStep = { ...steps[0], key: "practice-20", practice: secondPractice };
  const summary = buildAssessmentDashboardSummary(model, [...steps, secondStep], {
    D1_M1_10_100: 0,
    D1_M1_10_101: 1,
    D1_M1_20_100: 0,
  }, emptyEvidence);
  assert.equal(summary.missingRequiredAnswerCount, 1);
  assert.equal(summary.missingEvidenceCount, 1);
  assert.equal(summary.dimensions[0].missingEvidenceCount, 1);
  assert.equal(summary.dimensions[0].requiredComplete, false);
});

test("tracks valid answers separately from answers still missing evidence", () => {
  const data: AssessmentData = {
    D1_M1_10_100: 1,
    D1_M1_10_101: 1,
  };
  const summary = buildAssessmentDashboardSummary(
    model,
    steps,
    data,
    emptyEvidence
  );

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.answeredCount, 2);
  assert.equal(summary.unansweredCount, 1);
  assert.equal(summary.progressPercentage, 67);
  assert.equal(summary.dimensions[0].requiredComplete, false);
  assert.equal(summary.dimensions[0].optionalUnansweredCount, 1);
  assert.equal(summary.dimensions[0].status, "in-progress");
  assert.equal(summary.missingEvidenceCount, 1);
  assert.equal(summary.dimensions[0].missingEvidenceCount, 1);
  assert.equal(summary.missingRequiredAnswerCount, 0);
});

test("completes required items with evidence while quietly tracking an optional blank", () => {
  const data: AssessmentData = {
    D1_M1_10_100: 1,
    D1_M1_10_101: 1,
  };
  const summary = buildAssessmentDashboardSummary(
    model,
    steps,
    data,
    suppliedEvidence
  );

  assert.equal(summary.answeredCount, 2);
  assert.equal(summary.unansweredCount, 1);
  assert.equal(summary.progressPercentage, 67);
  assert.equal(summary.dimensions[0].requiredComplete, true);
  assert.equal(summary.dimensions[0].optionalUnansweredCount, 1);
  assert.equal(summary.dimensions[0].status, "completed");
  assert.equal(summary.missingEvidenceCount, 0);
});

test("all answers can be complete while dashboard still identifies missing practice evidence", () => {
  const data: AssessmentData = { D1_M1_10_100: 0, D1_M1_10_101: 1 };
  const summary = buildAssessmentDashboardSummary(model, steps, data, emptyEvidence);
  assert.equal(summary.progressPercentage, 100);
  assert.equal(summary.missingEvidenceCount, 1);
  assert.equal(summary.missingRequiredAnswerCount, 0);
  assert.equal(summary.dimensions[0].requiredComplete, false);
  const ready = buildAssessmentDashboardSummary(model, steps, data, suppliedEvidence);
  assert.equal(ready.missingEvidenceCount, 0);
  assert.equal(ready.dimensions[0].requiredComplete, true);
});

test("counts ordinary answers and excludes dependencies disabled by a No answer", () => {
  const data: AssessmentData = {
    D1_M1_10_100: 0,
    D1_M1_10_101: 1,
  };
  const summary = buildAssessmentDashboardSummary(
    model,
    steps,
    data,
    suppliedEvidence
  );

  assert.equal(summary.totalCount, 2);
  assert.equal(summary.answeredCount, 2);
  assert.equal(summary.unansweredCount, 0);
  assert.equal(summary.progressPercentage, 100);
  assert.equal(summary.dimensions[0].requiredComplete, true);
});

test("derives the journey stage from assessment activity and review readiness", () => {
  const untouched = buildAssessmentDashboardSummary(
    model,
    steps,
    {},
    emptyEvidence
  );
  const active = buildAssessmentDashboardSummary(
    model,
    steps,
    {
      D1_M1_10_100: 1,
    },
    emptyEvidence
  );

  assert.equal(getAssessmentJourneyStage(untouched, false), "overview");
  assert.equal(getAssessmentJourneyStage(active, false), "questions");
  assert.equal(getAssessmentJourneyStage(active, true), "review");
});

test("opens a completed dimension at its first unresolved optional practice", () => {
  const optionalPractice = {
    id: 20,
    code: "P2",
    name: "Optional practice",
    questions: [
      {
        id: 200,
        code: "Q4",
        weight: 1,
        text: "Optional context",
        type: "open_answer" as const,
        help: "",
        required: false,
      },
    ],
  };
  const reviewSteps: AssessmentPracticeStep[] = [
    steps[0],
    {
      key: "practice-20",
      dimension,
      module,
      practice: optionalPractice,
    },
  ];
  const data: AssessmentData = {
    D1_M1_10_100: 0,
    D1_M1_10_101: 1,
  };

  assert.equal(
    findDimensionEntryPractice(
      dimension,
      reviewSteps,
      data,
      suppliedEvidence
    )?.key,
    "practice-20"
  );
});

test("formats the workspace title without duplicating the assessment suffix", () => {
  assert.equal(formatAssessmentTitle("Cybersecurity"), "Cybersecurity Assessment");
  assert.equal(
    formatAssessmentTitle("Cybersecurity Assessment"),
    "Cybersecurity Assessment"
  );
});

test("summarizes evaluator feedback overall and by dimension", () => {
  const summary = buildAssessmentDashboardSummary(
    model,
    steps,
    {
      D1_M1_10_100: 1,
      D1_M1_10_101: 1,
    },
    suppliedEvidence,
    {
      D1_M1_10_100: {
        responseKey: "D1_M1_10_100",
        questionId: 100,
        validationStatus: "FLAGGED",
        reviewerNote: "Clarify the implementation details.",
      },
      D1_M1_10_101: {
        responseKey: "D1_M1_10_101",
        questionId: 101,
        validationStatus: "ADJUSTED",
        reviewerNote: "Score adjusted based on the evidence.",
      },
    }
  );

  assert.equal(summary.flaggedCount, 1);
  assert.equal(summary.outstandingFlaggedCount, 1);
  assert.equal(summary.adjustedCount, 1);
  assert.equal(summary.dimensions[0].flaggedCount, 1);
  assert.equal(summary.dimensions[0].outstandingFlaggedCount, 1);
  assert.equal(summary.dimensions[0].adjustedCount, 1);
});
