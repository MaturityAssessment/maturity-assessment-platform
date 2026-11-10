import test from "node:test";
import assert from "node:assert/strict";
import type { AssessmentEvidenceInputItem } from "../../../../src/api/types.ts";
import { hasEvidenceContentChanges, setEvidenceQuestionReference, questionReferenceLabel } from "../../../../src/app/assessment/evidenceReferences.ts";
import { cloneEvidenceSnapshot, reconcileSavedEvidence } from "../../../../src/app/assessment/assessmentAutosave.ts";
import { buildEvidencePayload, hydrateEvidenceByField } from "../../../../src/app/assessment/assessmentEvidence.ts";
import { buildAssessmentResultsExportData } from "../../../../src/app/assessment/assessmentResultsExport.ts";
import { pruneDisabledQuestionData, isPracticeRequiredComplete } from "../../../../src/app/assessment/assessmentFlowUtils.ts";

const item: AssessmentEvidenceInputItem = { id: "item", evidenceId: 7, practiceId: 10, type: "link",
  description: "Policy", file: null, url: "https://example.com/policy", referencedQuestionIds: [100] };
const step = { key: "practice-10", dimension: { id: "D", name: "Dimension", modules: [] },
  module: { code: "M", name: "Module", practices: [] }, practice: { id: 10, name: "Practice", requiresEvidence: true,
    questions: [
      { id: 100, code: "Q1", text: "Documented?", type: "boolean" as const, weight: 1, help: "" },
      { id: 101, code: "Q2", text: "Details?", type: "open_answer" as const, weight: 1, help: "", dependsOnQuestionId: 100,
        dependencyCondition: { type: "boolean" as const, answers: [true] } },
    ] } };
const persisted = { id: 7, clientKey: "item", assessmentId: 1, practiceId: 10, evidenceType: "URL" as const,
  description: "Policy", url: item.url, createdAt: "", referencedQuestionIds: [100] };

test("reuse and unlink change only the selected reference without adding evidence or uploads", () => {
  const items = Array.from({ length: 5 }, (_, index) => ({ ...item, id: `item-${index}`, evidenceId: index + 1 }));
  const linked = setEvidenceQuestionReference(items, "item-0", 101, true);
  assert.equal(linked.length, 5);
  assert.equal(linked[0].evidenceId, 1);
  assert.deepEqual(linked[0].referencedQuestionIds, [100, 101]);
  assert.deepEqual(items[0].referencedQuestionIds, [100]);
  assert.deepEqual(setEvidenceQuestionReference(linked, "item-0", 101, true)[0].referencedQuestionIds, [100, 101]);
  const unlinked = setEvidenceQuestionReference(linked, "item-0", 100, false);
  assert.deepEqual(unlinked[0].referencedQuestionIds, [101]);
  assert.equal(unlinked.length, 5);
  assert.deepEqual(buildEvidencePayload(new Map([["practice_10_evidence", linked]])).uploads, []);
});

test("reference-only edits cannot resolve flagged content, but actual content changes can", () => {
  const linked = setEvidenceQuestionReference([item], item.id, 101, true);
  assert.equal(hasEvidenceContentChanges([item], linked), false);
  assert.equal(hasEvidenceContentChanges([item], [{ ...item, referencedQuestionIds: [] }]), false);
  assert.equal(hasEvidenceContentChanges([item], [{ ...item, description: "Corrected policy" }]), true);
  assert.equal(hasEvidenceContentChanges([item], [{ ...item, url: "https://example.com/revised" }]), true);
  assert.equal(hasEvidenceContentChanges([item], []), true);
});

test("reference arrays survive reload and are copied into payloads and autosave snapshots", () => {
  const hydrated = hydrateEvidenceByField([persisted], [step]);
  const hydratedItem = hydrated.get("practice_10_evidence")![0];
  assert.deepEqual(hydratedItem.referencedQuestionIds, [100]);
  const snapshot = cloneEvidenceSnapshot(hydrated);
  const payload = buildEvidencePayload(hydrated);
  hydratedItem.referencedQuestionIds!.push(101);
  assert.deepEqual(snapshot.get("practice_10_evidence")![0].referencedQuestionIds, [100]);
  assert.deepEqual(payload.metadata[0].referencedQuestionIds, [100]);
  assert.deepEqual(persisted.referencedQuestionIds, [100]);
});

test("late save responses do not restore removed links or overwrite links added in flight", () => {
  const sent = new Map([["practice_10_evidence", [item]]]);
  for (const ids of [[], [100, 101], [101]]) {
    const current = new Map([["practice_10_evidence", [{ ...item, referencedQuestionIds: ids }]]]);
    const result = reconcileSavedEvidence(cloneEvidenceSnapshot(sent), current, [persisted]);
    assert.deepEqual(result.get("practice_10_evidence")![0].referencedQuestionIds, ids);
  }
  const removed = reconcileSavedEvidence(sent, new Map(), [persisted]);
  assert.equal(removed.size, 0);
});

test("inactivating and clearing answers preserves practice evidence and its optional references", () => {
  const evidence = new Map([["practice_10_evidence", [{ ...item, referencedQuestionIds: [100, 101] }]]]);
  const pruned = pruneDisabledQuestionData([step], { D_M_10_100: 0, D_M_10_101: "Previous details" });
  assert.equal(pruned.formData.D_M_10_101, undefined);
  assert.deepEqual(evidence.get("practice_10_evidence")![0].referencedQuestionIds, [100, 101]);
  assert.equal(isPracticeRequiredComplete(step, pruned.formData, evidence), true);
  assert.equal(isPracticeRequiredComplete(step, pruned.formData, new Map()), false);
});

test("exports distinguish direct references from general evidence and exclude links to other questions", () => {
  const model = { id: 1, name: "Model", description: "", isActive: true, dimensions: [{ ...step.dimension,
    modules: [{ ...step.module, practices: [step.practice] }] }] };
  const data = buildAssessmentResultsExportData({ id: 1, overallAverage: 1, overallMaturityLevel: "Level 1",
    isCompleted: true, createdAt: "", evidence: [persisted, { ...persisted, id: 8, url: "https://example.com/general", referencedQuestionIds: [] }] }, model, [step]);
  assert.match(data.answers[0].evidence, /Linked to this question: https:\/\/example.com\/policy/);
  assert.match(data.answers[0].evidence, /General practice evidence: https:\/\/example.com\/general/);
  assert.doesNotMatch(data.answers[1].evidence, /example.com\/policy/);
  assert.match(data.answers[1].evidence, /General practice evidence/);
  assert.match(questionReferenceLabel(step.practice.questions[0]), /^Q1: Documented\?/);
});
