import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyDocument, emptyQuestion, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { deleteQuestion, reorderQuestion } from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
import { branchingSummary, branchingWouldCycle, dependencyColumns, editableBranching, parentCodes, setQuestionBranching } from "../../../../src/app/maturity-models/editor/model/questionBranchingEditor.ts";
import { branchingIssues, evaluateBranching } from "../../../../src/lib/questionBranching.ts";
import { dependencyMatches } from "../../../../src/lib/questionDependencies.ts";
import type { BranchingExpression } from "../../../../src/api/types.ts";

const answered = (code: string): BranchingExpression => ({ kind: "parent", code, predicate: { kind: "answered" } });
test("editing legacy dependencies preserves answer matching, including implicit Yes and equal-score choices", () => {
  for (const parent of [emptyQuestion(1), { ...emptyQuestion(1), type: "multiple_choice" as const, choices: [{ id: "a", label: "A", score: 0.5 }, { id: "b", label: "B", score: 0.5 }] }]) {
    const child = { ...emptyQuestion(2), dependsOnQuestionCode: parent.code,
      dependencyCondition: parent.type === "multiple_choice" ? { type: "multiple_choice" as const, optionIds: ["b"] } : undefined, hiddenScore: 0.5 };
    const expression = editableBranching(child, [parent, child])!;
    const edited = setQuestionBranching(child, expression);
    assert.equal(edited.dependsOnQuestionCode, undefined);
    assert.equal(edited.dependencyCondition, undefined);
    assert.equal(edited.hiddenScore, 0.5);
    assert.deepEqual(branchingIssues([parent, edited]), []);
    for (const [response, typed] of parent.type === "boolean" ? [[true, true], [false, false]] : [["choice:0", "a"], ["choice:1", "b"]]) {
      assert.equal(evaluateBranching(expression, () => typed), dependencyMatches(parent, child.dependencyCondition, response));
    }
    const cleared = setQuestionBranching(edited);
    assert.equal(cleared.hiddenScore, undefined);
    assert.equal(cleared.branchingRule, undefined);
  }
});
test("candidate filtering detects mixed legacy/branching descendants and shared DAG ancestors", () => {
  const a = emptyQuestion(1), b = { ...emptyQuestion(2), dependsOnQuestionCode: a.code };
  const c = setQuestionBranching(emptyQuestion(3), { kind: "not", condition: { kind: "or", conditions: [answered(a.code), answered(b.code)] } });
  const d = emptyQuestion(4), questions = [a, b, c, d];
  assert.equal(branchingWouldCycle(questions, a.code, c.code.toLowerCase()), true);
  assert.equal(branchingWouldCycle(questions, b.code, c.code), true);
  assert.equal(branchingWouldCycle(questions, d.code, c.code), false);
  assert.equal(branchingWouldCycle(questions, d.code, d.code), true);
});
test("graph layout puts every parent before its dependent regardless of display order", () => {
  const a = emptyQuestion(1), b = emptyQuestion(2);
  const c = setQuestionBranching(emptyQuestion(3), { kind: "and", conditions: [answered(a.code), answered(b.code)] });
  const d = { ...emptyQuestion(4), dependsOnQuestionCode: c.code };
  assert.deepEqual(dependencyColumns([d, c, a, b]).map(column => column.map(q => q.code)), [[a.code, b.code], [c.code], [d.code]]);
  assert.deepEqual(parentCodes(editableBranching(c, [a, b, c])), [a.code, b.code]);
  // Invalid imported cycles must stay inspectable rather than hanging the editor.
  assert.equal(dependencyColumns([{ ...a, dependsOnQuestionCode: b.code }, { ...b, dependsOnQuestionCode: a.code }]).flat().length, 2);
});
test("readable rule summary preserves groups, NOT, stable option labels, and N/A", () => {
  const parent = { ...emptyQuestion(1), type: "multiple_selection" as const, choices: [{ id: "a", label: "Policy", score: 0.5 }] };
  const expression: BranchingExpression = { kind: "not", condition: { kind: "or", conditions: [
    { kind: "parent", code: parent.code, predicate: { kind: "in", values: ["a", { notApplicable: true }] } }, answered("Q2"),
  ] } };
  assert.equal(branchingSummary(expression, [parent]), `Not (((${parent.code} includes all of [Policy] OR ${parent.code} is N/A) OR Q2 has an answer))`);
});

test("authored rules, zero defaults and evidence links survive save/reload and reordering has no spurious rule changes", () => {
  const document = createEmptyDocument(), practice = document.dimensions[0].modules[0].practices[0];
  const parent = practice.questions[0];
  const child = { ...setQuestionBranching(emptyQuestion(2), answered(parent.code)), hiddenScore: 0 };
  practice.questions.push(child);
  practice.evidenceRequirements = [{ code: "REPORT", name: "Report", instructions: "", required: true, format: "ANY", questionCodes: [child.code] }];
  const reloaded = hydrateDocument(serializeDocument(document) as typeof document, false);
  const restored = reloaded.dimensions[0].modules[0].practices[0];
  assert.deepEqual(restored.questions[1].branchingRule, child.branchingRule);
  assert.equal(restored.questions[1].hiddenScore, 0);
  assert.deepEqual(restored.evidenceRequirements?.[0].questionCodes, [child.code]);
  const moved = reorderQuestion(document, practice.clientKey, child.clientKey, parent.clientKey);
  assert.deepEqual(compareDocuments(document, moved).counts, { added: 0, removed: 0, updated: 0, order: 1 });
});

test("deleting a legacy parent also removes the hidden default that required its dependency", () => {
  const document = createEmptyDocument(), practice = document.dimensions[0].modules[0].practices[0];
  const parent = practice.questions[0];
  practice.questions.push({ ...emptyQuestion(2), dependsOnQuestionCode: parent.code, hiddenScore: 0 });
  const updated = deleteQuestion(document, practice.clientKey, parent.clientKey);
  const questions = updated.dimensions[0].modules[0].practices[0].questions;
  assert.equal(questions[0].hiddenScore, undefined);
  assert.deepEqual(branchingIssues(questions), []);
});
