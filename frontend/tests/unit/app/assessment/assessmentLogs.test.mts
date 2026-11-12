import test from "node:test";
import assert from "node:assert/strict";
import type { AssessmentLog } from "../../../../src/api/types.ts";
import { describeAssessmentLog, formatLogValue } from "../../../../src/app/assessment/assessmentLogs.ts";

const log: AssessmentLog = {
  id: 1, assessmentId: 23, actorUserId: 7, actorName: "Maria", actorRole: "RESPONDENT",
  action: "ANSWER_CHANGED", targetType: "QUESTION", targetId: 1001, targetLabel: "Q1 — Is a policy in place?",
  beforeValue: { response: 0, answerLabel: "No" }, afterValue: { response: 1, answerLabel: "Yes" },
  occurredAt: "2026-11-12T10:30:00Z",
};

test("describes changes using people and item names", () => {
  assert.equal(describeAssessmentLog(log), "Maria changed the answer to “Q1 — Is a policy in place?”.");
  assert.equal(describeAssessmentLog({ ...log, actorName: "", actorEmail: "maria@example.test", action: "ANSWER_REMOVED" }),
    "maria@example.test cleared the answer to “Q1 — Is a policy in place?”.");
  assert.equal(describeAssessmentLog({ ...log, actorName: null, action: "ASSESSMENT_SUBMITTED" }), "Respondent submitted the assessment.");
});

test("covers every respondent action without exposing event codes", () => {
  for (const action of ["ASSESSMENT_CREATED", "ASSESSMENT_SUBMITTED", "ASSESSMENT_RESUBMITTED", "ASSESSMENT_RESET",
    "REFERENCE_DATE_CHANGED", "ANSWER_ADDED", "ANSWER_CHANGED", "ANSWER_REMOVED", "JUSTIFICATION_CHANGED",
    "REVIEW_UPDATE_CONFIRMED", "EVIDENCE_ADDED", "EVIDENCE_CHANGED", "EVIDENCE_REMOVED"]) {
    const description = describeAssessmentLog({ ...log, action });
    assert.ok(description.startsWith("Maria "));
    assert.ok(!description.includes(action));
    assert.ok(!description.includes("updated “"), `Action ${action} should have its own description`);
  }
});

test("uses the historical option label and retains justification", () => {
  assert.equal(formatLogValue(log, { response: 1, choiceIndex: 1, answerLabel: "Regular reviews", justification: "Reviewed annually" }),
    "Regular reviews\nJustification: Reviewed annually");
  assert.equal(formatLogValue(log, null), "None");
});

test("formats evidence and lifecycle values in readable terms", () => {
  const evidence = { ...log, targetType: "EVIDENCE" };
  assert.equal(formatLogValue(evidence, { type: "FILE", fileName: "policy.pdf", description: "Approved policy",
    collectedAt: "2026-11-01", requirementCode: "report", requirementLabel: "Annual report", referencedQuestions: ["Q1 — Policy"] }),
    "File evidence\npolicy.pdf\nApproved policy\nCollected on: 2026-11-01\nRequirement: Annual report\nReferenced questions: Q1 — Policy");
  assert.equal(formatLogValue({ ...log, targetType: "ASSESSMENT" }, "CHANGES_REQUESTED"), "Changes requested");
});

test("compact rows identify questions by the full public code path", async () => {
  const { buildLogQuestions, assessmentLogTarget, assessmentLogAction } = await import("../../../../src/app/assessment/assessmentLogs.ts");
  const model = { dimensions: [{ id: "GOV", modules: [{ code: "M2", practices: [
    { id: 33, code: "P4", questions: [{ id: 1001, code: "Q3", text: "A long question" }] },
    { id: 34, code: "P5", questions: [{ id: 1002, code: "Q3", text: "Another question with the same local code" }] },
  ] }] }] } as import("../../../../src/api/types.ts").MaturityModel;
  const questions = buildLogQuestions(model);
  assert.equal(assessmentLogTarget(log, questions), "GOV / M2 / P4 / Q3");
  assert.equal(assessmentLogTarget({ ...log, targetId: 1002 }, questions), "GOV / M2 / P5 / Q3");
  assert.equal(assessmentLogTarget(log, new Map()), "Q1");
  assert.equal(assessmentLogTarget({ ...log, targetType: "EVIDENCE" }, questions), "Evidence");
  assert.equal(assessmentLogAction(log.action), "Answer changed");
  assert.equal(buildLogQuestions(null).size, 0);
});

test("hierarchical filters scope options and clear descendants on parent changes", async () => {
  const { changeLogFilter, emptyLogFilters, logFilterOptions } = await import("../../../../src/app/assessment/assessmentLogs.ts");
  const model = { dimensions: [
    { id: "D1", modules: [{ code: "M1", practices: [{ id: 1, questions: [{ id: 11 }] }, { id: 2, questions: [{ id: 22 }] }] }] },
    { id: "D2", modules: [{ code: "M1", practices: [{ id: 3, questions: [{ id: 33 }] }] }, { code: "M2", practices: [] }] },
  ] } as import("../../../../src/api/types.ts").MaturityModel;
  assert.equal(logFilterOptions(model, emptyLogFilters).modules.length, 0);
  assert.equal(logFilterOptions(model, emptyLogFilters).practices.length, 0);
  const selected = { dimensionId: "D1", moduleCode: "M1", practiceId: "1", questionId: "11" };
  assert.deepEqual(logFilterOptions(model, selected).questions.map(q => q.id), [11]);
  assert.deepEqual(logFilterOptions(model, { ...selected, dimensionId: "D2" }).practices.map(p => p.id), [3]);
  assert.deepEqual(changeLogFilter(selected, "dimensionId", "D2"), { dimensionId: "D2", moduleCode: "", practiceId: "", questionId: "" });
  assert.deepEqual(changeLogFilter(selected, "moduleCode", ""), { dimensionId: "D1", moduleCode: "", practiceId: "", questionId: "" });
  assert.equal(changeLogFilter(selected, "practiceId", "2").questionId, "");
});

test("row shortcuts select the full question hierarchy or the evidence practice", async () => {
  const { logEntryFilters } = await import("../../../../src/app/assessment/assessmentLogs.ts");
  const model = { dimensions: [
    { id: "D1", modules: [{ code: "M1", practices: [{ id: 10, questions: [{ id: 1001 }] }] }] },
    { id: "D2", modules: [{ code: "M1", practices: [{ id: 20, questions: [{ id: 2001 }] }] }] },
  ] } as import("../../../../src/api/types.ts").MaturityModel;
  assert.deepEqual(logEntryFilters(log, model), { dimensionId: "D1", moduleCode: "M1", practiceId: "10", questionId: "1001" });
  const evidence = { ...log, targetType: "EVIDENCE", targetId: 1001, beforeValue: { practiceId: 10 }, afterValue: { practiceId: 20 } };
  assert.deepEqual(logEntryFilters(evidence, model), { dimensionId: "D2", moduleCode: "M1", practiceId: "20", questionId: "" });
  assert.deepEqual(logEntryFilters({ ...evidence, afterValue: null }, model), { dimensionId: "D1", moduleCode: "M1", practiceId: "10", questionId: "" });
  assert.equal(logEntryFilters({ ...log, targetType: "ASSESSMENT" }, model), null);
  assert.equal(logEntryFilters(log, null), null);
  assert.equal(logEntryFilters({ ...log, targetId: 9999 }, model), null);
});
