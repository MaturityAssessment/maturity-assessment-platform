import test from "node:test";
import assert from "node:assert/strict";
import type { AssessmentResponse, MaturityModelSummary } from "../../../../src/api/types.ts";
import {
  buildAssessmentView,
  canOpenAssessment,
  formatRelativeDate,
  getAssessmentDomain,
  getAssessmentName,
  getAssessmentProgress,
  getAssessmentScorePercentage,
  getAssessmentStatus,
  getAssessmentVersion,
  sortAssessments,
} from "../../../../src/app/dashboard/dashboardAssessments.ts";

const model: MaturityModelSummary = {
  id: 7,
  name: "Security maturity",
  description: "Security model",
  dimensionCount: 2,
  moduleCount: 4,
  totalQuestions: 10,
  levelCount: 5,
  isActive: true,
  version: 3,
  domainName: "Cybersecurity",
  domainIconKey: "shield",
  domainColorKey: "blue",
  createdAt: "2026-01-01T00:00:00Z",
};
const models = { [model.id]: model };

function assessment(
  overrides: Partial<AssessmentResponse> = {}
): AssessmentResponse {
  return {
    id: 1,
    overallAverage: 0,
    overallMaturityLevel: "Draft",
    isCompleted: false,
    status: "DRAFT",
    maturityModelId: model.id,
    createdAt: "2026-07-01T09:00:00Z",
    ...overrides,
  };
}

test("sorts assessments by their latest saved time", () => {
  const older = assessment({ id: 1, updatedAt: "2026-07-01T10:00:00Z" });
  const newer = assessment({ id: 2, updatedAt: "2026-07-02T10:00:00Z" });

  assert.deepEqual(
    sortAssessments([older, newer]).map((item) => item.id),
    [2, 1]
  );
});

test("resolves model metadata and assessment fallbacks", () => {
  const current = assessment();
  assert.equal(getAssessmentName(current, models), "Security maturity");
  assert.equal(getAssessmentDomain(current, models), "Cybersecurity");
  assert.equal(getAssessmentVersion(current, models), 3);

  const unknown = assessment({ maturityModelId: 99, domainName: "Data" });
  assert.equal(getAssessmentName(unknown, {}), "Data assessment");
  assert.equal(getAssessmentDomain(unknown, {}), "Data");
  assert.equal(getAssessmentVersion(unknown, {}), undefined);
});

test("calculates draft progress from unique saved question fields", () => {
  const draft = assessment({
    questionEvaluations: {
      question_1: {
        responseKey: "question_1",
        questionId: 1,
        response: 1,
        respondentJustification: "Evidence",
      },
      question_2: {
        responseKey: "question_2",
        questionId: 2,
        response: 2,
      },
    },
  });

  assert.equal(getAssessmentProgress(draft, models), 20);
  assert.equal(
    getAssessmentProgress(
      assessment({ status: "COMPLETED", isCompleted: true }),
      models
    ),
    100
  );
});

test("uses authoritative score percentage before the level fallback", () => {
  assert.equal(
    getAssessmentScorePercentage(
      assessment({ overallAverage: 2.5, overallPercentageScore: 72.4 }),
      models
    ),
    72
  );
  assert.equal(
    getAssessmentScorePercentage(assessment({ overallAverage: 4 }), models),
    80
  );
});

test("derives status and openability consistently", () => {
  const draft = assessment();
  const pending = assessment({ status: "PENDING_REVIEW" });
  const changesRequested = assessment({ status: "CHANGES_REQUESTED" });
  const completed = assessment({ status: "COMPLETED", isCompleted: true });

  assert.equal(getAssessmentStatus(draft), "draft");
  assert.equal(getAssessmentStatus(pending), "pending-review");
  assert.equal(getAssessmentStatus(changesRequested), "changes-requested");
  assert.equal(getAssessmentStatus(completed), "completed");
  assert.equal(canOpenAssessment(draft), true);
  assert.equal(canOpenAssessment(pending), false);
  assert.equal(canOpenAssessment(changesRequested), true);
  assert.equal(canOpenAssessment(completed), true);
});

test("formats relative dates against an injected clock", () => {
  const now = new Date("2026-07-11T12:00:00Z").getTime();
  assert.equal(formatRelativeDate("2026-07-11T11:59:30Z", now), "Just now");
  assert.equal(formatRelativeDate("2026-07-11T11:45:00Z", now), "15 mins ago");
  assert.equal(formatRelativeDate("2026-07-11T10:00:00Z", now), "2 hours ago");
  assert.equal(formatRelativeDate("2026-07-09T12:00:00Z", now), "2 days ago");
  assert.equal(formatRelativeDate("not-a-date", now), "Recently");
});

test("builds the presentation view without changing the source assessment", () => {
  const source = assessment({
    questionEvaluations: {
      question_1: {
        responseKey: "question_1",
        questionId: 1,
        response: 1,
      },
    },
  });
  const view = buildAssessmentView(
    source,
    models,
    new Date("2026-07-01T10:00:00Z").getTime()
  );

  assert.equal(view.assessment, source);
  assert.equal(view.name, "Security maturity");
  assert.equal(view.progress, 10);
  assert.equal(view.status, "draft");
  assert.equal(view.domainIconKey, "shield");
  assert.equal(view.domainColorKey, "blue");
  assert.equal(view.updatedLabel, "1 hour ago");
});
