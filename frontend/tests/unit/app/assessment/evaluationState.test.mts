import test from "node:test";
import assert from "node:assert/strict";
import { assessmentCapabilities, mergeAgentReviews, reviewNeedsAttention } from "../../../../src/app/assessment/evaluation/evaluationState.ts";
import type { AssessmentResponse, AgentEvaluationDraftResponse } from "../../../../src/api/types.ts";
import type { EvaluationQuestion, QuestionReviewDraft } from "../../../../src/app/assessment/evaluation/types.ts";

const assessment = { id: 1, userId: 10, status: "PENDING_REVIEW", isCompleted: false } as AssessmentResponse;
const admin = { id: 20, role: "ADMIN" as const };
const respondent = { id: 10, role: "USER" as const };
test("only authenticated evaluators can review submitted assessments; campaign links remain respondent-only", () => {
  for (const role of ["ADMIN", "CURATOR"] as const) {
    assert.deepEqual(assessmentCapabilities(assessment, { id: 20, role }), { canEvaluate: true, canEditEvaluation: true, canEditResponses: false });
  }
  for (const user of [respondent, null, undefined]) {
    assert.equal(assessmentCapabilities(assessment, user).canEvaluate, false);
    assert.equal(assessmentCapabilities(assessment, user).canEditResponses, false);
  }
  assert.equal(assessmentCapabilities(assessment, admin, "token").canEvaluate, false);
  assert.equal(assessmentCapabilities({ ...assessment, status: "DRAFT" }, admin).canEvaluate, false);
});
test("completed and returned evaluations are read-only, while owners retain response-editing rights", () => {
  for (const status of ["COMPLETED", "CHANGES_REQUESTED"] as const) {
    const caps = assessmentCapabilities({ ...assessment, status }, admin);
    assert.equal(caps.canEvaluate, true);
    assert.equal(caps.canEditEvaluation, false);
    assert.equal(caps.canEditResponses, false);
  }
  for (const role of ["USER", "CURATOR", "ADMIN"] as const) {
    assert.equal(assessmentCapabilities({ ...assessment, status: "CHANGES_REQUESTED" }, { id: 10, role }).canEditResponses, true);
  }
  assert.equal(assessmentCapabilities({ ...assessment, status: "DRAFT" }, respondent).canEditResponses, true);
  assert.equal(assessmentCapabilities({ ...assessment, status: "CHANGES_REQUESTED" }, null, "token").canEditResponses, true);
  assert.equal(assessmentCapabilities({ ...assessment, isCompleted: true }, admin).canEditEvaluation, false);
});
test("agent merge protects partial, saved, cleared, and in-flight human reviews", () => {
  const reviews: Record<string, QuestionReviewDraft> = {
    saved: { validationStatus: "ACCEPTED", reviewerNote: "" },
    note: { reviewerNote: "Human note" },
    score: { manualScore: 0, reviewerNote: "" },
    cleared: { reviewerNote: "" },
    untouched: { reviewerNote: "" },
  };
  const draft = { questionEvaluations: Object.fromEntries([...Object.keys(reviews), "foreign"].map(key => [key, { validationStatus: "FLAGGED", reviewerNote: "Agent note" }])) } as AgentEvaluationDraftResponse;
  const result = mergeAgentReviews(reviews, draft, new Set(["cleared"]));
  for (const key of ["saved", "note", "score", "cleared"]) assert.deepEqual(result[key], reviews[key]);
  assert.equal(result.untouched.validationStatus, "FLAGGED");
  assert.equal(result.foreign, undefined);
  assert.equal(reviews.untouched.validationStatus, undefined);
});
test("review navigation includes missing scores and notes even when a status is selected", () => {
  const automatic = { requiresManualScore: false } as EvaluationQuestion;
  const manual = { requiresManualScore: true } as EvaluationQuestion;
  assert.equal(reviewNeedsAttention(automatic, { reviewerNote: "" }), true);
  assert.equal(reviewNeedsAttention(automatic, { validationStatus: "ACCEPTED", reviewerNote: "" }), false);
  assert.equal(reviewNeedsAttention(manual, { validationStatus: "ACCEPTED", reviewerNote: "" }), true);
  assert.equal(reviewNeedsAttention(automatic, { validationStatus: "ADJUSTED", manualScore: 0, reviewerNote: "" }), true);
  assert.equal(reviewNeedsAttention(automatic, { validationStatus: "ADJUSTED", manualScore: 0, reviewerNote: "Evidence differs" }), false);
  assert.equal(reviewNeedsAttention(automatic, { validationStatus: "FLAGGED", reviewerNote: "Please clarify" }), true);
});
