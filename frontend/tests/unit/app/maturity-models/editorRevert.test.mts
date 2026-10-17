import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyDocument, emptyQuestion, emptyDimension } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { revertEditorChange } from "../../../../src/app/maturity-models/editor/model/editorRevert.ts";
import { deleteQuestion, moveQuestion, updateQuestion } from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
const practice = (document: ReturnType<typeof createEmptyDocument>) => document.dimensions[0].modules[0].practices[0];
const question = (document: ReturnType<typeof createEmptyDocument>) => practice(document).questions[0];

test("reverting an item restores its own settings while preserving child and unrelated edits", () => {
  const baseline = createEmptyDocument();
  const current = structuredClone(baseline);
  current.dimensions[0].name = "Changed dimension";
  question(current).text = "Changed question";
  current.description = "Unrelated description";
  const snapshot = structuredClone(current);
  const next = revertEditorChange(current, baseline, current.dimensions[0].clientKey);
  assert.equal(next.dimensions[0].name, baseline.dimensions[0].name);
  assert.equal(question(next).text, "Changed question");
  assert.equal(next.description, "Unrelated description");
  assert.deepEqual(current, snapshot);
  const done = revertEditorChange(next, baseline, question(next).clientKey);
  assert.equal(compareDocuments(baseline, done).structure.length, 0);
  assert.equal(done.description, "Unrelated description");
});

test("reverting an addition removes its subtree and cleans references to added questions", () => {
  const baseline = createEmptyDocument();
  const current = structuredClone(baseline);
  const added = emptyQuestion(2);
  practice(current).questions.push(added);
  question(current).dependsOnQuestionCode = added.code;
  question(current).dependencyCondition = { type: "boolean", answers: [true] };
  practice(current).gatingRules = [{ order: 0, selection: "specificChild", childCode: added.code, operator: ">", threshold: 0, operation: "set", value: 1 }];
  const next = revertEditorChange(current, baseline, `added:${added.clientKey}`);
  assert.equal(practice(next).questions.length, 1);
  assert.equal(question(next).dependsOnQuestionCode, undefined);
  assert.equal(question(next).dependencyCondition, undefined);
  assert.deepEqual(practice(next).gatingRules, []);
  const dimension = emptyDimension(2, 1, 1, 1);
  current.dimensions.push(dimension);
  assert.equal(revertEditorChange(current, baseline, `added:${dimension.clientKey}`).dimensions.length, 1);
});

test("restoring deleted questions resolves code collisions without redirecting current references", () => {
  const baseline = createEmptyDocument();
  const first = question(baseline);
  const second = { ...emptyQuestion(2), code: "Q02_SECOND" };
  const third = { ...emptyQuestion(3), code: "Q03_THIRD", dependsOnQuestionCode: second.code, dependencyCondition: { type: "boolean" as const, answers: [true] } };
  practice(baseline).questions.push(second, third);
  practice(baseline).gatingRules = [{ order: 0, selection: "specificChild", childCode: second.code, operator: ">", threshold: 0, operation: "set", value: 1 }];
  const current = deleteQuestion(structuredClone(baseline), practice(baseline).clientKey, first.clientKey);
  practice(current).questions[0].text = "Keep my edit";
  const next = revertEditorChange(current, baseline, `removed:${first.clientKey}`);
  assert.deepEqual(practice(next).questions.map(item => item.clientKey), practice(baseline).questions.map(item => item.clientKey));
  assert.equal(practice(next).questions[1].text, "Keep my edit");
  assert.equal(practice(next).questions[2].dependsOnQuestionCode, practice(next).questions[1].code);
  assert.equal(practice(next).gatingRules[0].childCode, practice(next).questions[1].code);
});

test("restoring order keeps additions, item edits, and reference identities", () => {
  const baseline = createEmptyDocument();
  practice(baseline).questions.push({ ...emptyQuestion(2), code: "Q02_SECOND", dependsOnQuestionCode: question(baseline).code, dependencyCondition: { type: "boolean", answers: [true] } });
  let current = moveQuestion(structuredClone(baseline), practice(baseline).clientKey, question(baseline).clientKey, 1);
  practice(current).questions[0].text = "Keep this edit";
  const addition = emptyQuestion(3);
  practice(current).questions.push(addition);
  const order = compareDocuments(baseline, current).structure.find(entry => entry.status === "order")!;
  const next = revertEditorChange(current, baseline, order.id);
  assert.equal(question(next).clientKey, question(baseline).clientKey);
  assert.equal(practice(next).questions[1].text, "Keep this edit");
  assert.equal(practice(next).questions[1].dependsOnQuestionCode, question(next).code);
  assert.equal(practice(next).questions[2].clientKey, addition.clientKey);
  assert.equal(compareDocuments(baseline, next).counts.order, 0);
});

test("restoring an item's code updates its dependents and gating references", () => {
  const baseline = createEmptyDocument();
  practice(baseline).questions.push({ ...emptyQuestion(2), dependsOnQuestionCode: question(baseline).code, dependencyCondition: { type: "boolean", answers: [true] } });
  const current = updateQuestion(baseline, practice(baseline).clientKey, question(baseline).clientKey, { ...question(baseline), code: "Q01_NEW" });
  const next = revertEditorChange(current, baseline, question(baseline).clientKey);
  assert.equal(practice(next).questions[1].dependsOnQuestionCode, question(baseline).code);
  assert.equal(compareDocuments(baseline, next).structure.length, 0);
});

test("a revert referencing a still-deleted item fails without mutating the draft", () => {
  const baseline = createEmptyDocument();
  practice(baseline).questions.push({ ...emptyQuestion(2), dependsOnQuestionCode: question(baseline).code, dependencyCondition: { type: "boolean", answers: [true] } });
  const current = deleteQuestion(baseline, practice(baseline).clientKey, question(baseline).clientKey);
  const snapshot = structuredClone(current);
  assert.throws(() => revertEditorChange(current, baseline, question(current).clientKey), /Restore the referenced item first/);
  assert.deepEqual(current, snapshot);
});

test("overview and notes revert independently; stale entries are a no-op", () => {
  const baseline = createEmptyDocument();
  const current = { ...structuredClone(baseline), name: "New name", changelogMarkdown: "New notes" };
  const next = revertEditorChange(current, baseline, "overview");
  assert.equal(next.name, baseline.name);
  assert.equal(next.changelogMarkdown, "New notes");
  assert.equal(revertEditorChange(next, baseline, "notes").changelogMarkdown, baseline.changelogMarkdown);
  assert.equal(revertEditorChange(next, baseline, "missing"), next);
});

test("reverting scale additions/removals keeps dimension mappings aligned", () => {
  const baseline = createEmptyDocument();
  const current = structuredClone(baseline);
  current.levels.push({ number: 6, name: "Extra" });
  current.dimensions[0].mappingRules.push({ levelNumber: 6, minimumScore: 0.95 });
  const next = revertEditorChange(current, baseline, "level:6");
  assert.deepEqual(next.levels, baseline.levels);
  assert.deepEqual(next.dimensions[0].mappingRules, baseline.dimensions[0].mappingRules);
  const removed = structuredClone(baseline);
  removed.levels.pop(); removed.dimensions[0].mappingRules.pop();
  const restored = revertEditorChange(removed, baseline, "level:5");
  assert.deepEqual(restored.levels, baseline.levels);
  assert.deepEqual(restored.dimensions[0].mappingRules, baseline.dimensions[0].mappingRules);
});


test("restoring a removed branch recovers its full contents without losing other branches", () => {
  const baseline = createEmptyDocument();
  const current = structuredClone(baseline);
  current.dimensions = [emptyDimension(1, 1, 1, 1)];
  const addedKey = current.dimensions[0].clientKey;
  const restored = revertEditorChange(current, baseline, `removed:${baseline.dimensions[0].clientKey}`);
  assert.equal(restored.dimensions.length, 2);
  assert.equal(restored.dimensions[0].clientKey, addedKey);
  assert.deepEqual(restored.dimensions[1].modules, baseline.dimensions[0].modules);
  assert.equal(compareDocuments(baseline, restored).counts.removed, 0);
});

test("reverting imported question options preserves dependent choices by unique label", () => {
  const baseline = createEmptyDocument();
  question(baseline).type = "multiple_choice";
  question(baseline).choices = [{ id: "source-option", label: "Yes", score: 1 }];
  practice(baseline).questions.push({ ...emptyQuestion(2), dependsOnQuestionCode: question(baseline).code, dependencyCondition: { type: "multiple_choice", optionIds: ["source-option"] } });
  const current = structuredClone(baseline);
  question(current).choices = [{ id: "import-option", label: "Yes", score: 0 }];
  practice(current).questions[1].dependencyCondition = { type: "multiple_choice", optionIds: ["import-option"] };
  const next = revertEditorChange(current, baseline, question(current).clientKey);
  assert.deepEqual(practice(next).questions[1].dependencyCondition, { type: "multiple_choice", optionIds: ["source-option"] });
  assert.equal(compareDocuments(baseline, next).counts.updated, 0);
});
