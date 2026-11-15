import test from "node:test";
import assert from "node:assert/strict";
import type { ConditionalGatingRule } from "../../../../src/api/types.ts";
import { createEmptyDocument, emptyQuestion, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { conditionalGatingIssues, gatingChildren, gatingIndex, repairConditionalReferences } from "../../../../src/app/maturity-models/editor/model/conditionalGating.ts";
import { moveQuestion, deleteQuestion, updateDimension } from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
import { createInitialEditorState, editorReducer } from "../../../../src/app/maturity-models/editor/state/editorReducer.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { revertEditorChange } from "../../../../src/app/maturity-models/editor/model/editorRevert.ts";
const practice = (d: ReturnType<typeof createEmptyDocument>) => d.dimensions[0].modules[0].practices[0];
function fixture() {
  const d = createEmptyDocument(), p = practice(d); p.questions.push(emptyQuestion(2));
  const options = gatingChildren(d, p.clientKey);
  p.conditionalGatingRules = [{ version: 1, effect: "flagForReview", when: { kind: "and", conditions: [{ kind: "children", quantifier: "any", selection: { codes: [options[0].code] }, where: { kind: "and", conditions: [{ kind: "comparison", field: "score", operator: "<", right: { kind: "field", code: options[1].code, field: "score" } }] } }] } }]; return d;
}
function apply(d: ReturnType<typeof fixture>, next: ReturnType<typeof fixture>) {
  const state = editorReducer(createInitialEditorState(false), { type: "initialize", document: d });
  return editorReducer(state, { type: "replaceDocument", document: next }).document!;
}
const clause = (d: ReturnType<typeof fixture>) => practice(d).conditionalGatingRules![0].when.conditions[0];
test("full paths survive serialization and hydration; question coverage is unavailable", () => {
  const d = fixture(), p = practice(d), options = gatingChildren(d, p.clientKey);
  assert.equal(options[0].code, `${d.dimensions[0].code}.${d.dimensions[0].modules[0].code}.${p.code}.${p.questions[0].code}`);
  assert.deepEqual(conditionalGatingIssues(p.conditionalGatingRules, options), []);
  assert.deepEqual(practice(hydrateDocument(serializeDocument(d) as unknown as typeof d, false)).conditionalGatingRules, p.conditionalGatingRules);
  clause(d).where.conditions[0].field = "coverage";
  assert.match(conditionalGatingIssues(p.conditionalGatingRules, options).join(), /unavailable/);
});
test("ancestor renames and swapped question prefixes preserve reference identities without false review changes", () => {
  const d = fixture(), p = practice(d), original = structuredClone(d);
  let next = apply(d, moveQuestion(d, p.clientKey, p.questions[0].clientKey, 1));
  const paths = gatingIndex(next).byKey, right = clause(next).where.conditions[0].right;
  assert.equal(clause(next).selection.codes![0], paths.get(p.questions[0].clientKey));
  assert.equal(right.kind === "field" && right.code, paths.get(p.questions[1].clientKey));
  next = apply(next, updateDimension(next, next.dimensions[0].clientKey, { ...next.dimensions[0], code: "D01_RENAMED" }));
  assert.match(clause(next).selection.codes![0], /^D01_RENAMED\./);
  assert.equal(compareDocuments(original, next).structure.some(e => e.fields.some(f => f.label === "Conditional gating rules")), false);
  assert.deepEqual(d, original);
});
test("deleting a target cannot redirect a rule to the item inheriting its code", () => {
  const d = fixture(), p = practice(d), next = apply(d, deleteQuestion(d, p.clientKey, p.questions[0].clientKey));
  assert.match(clause(next).selection.codes![0], /^missing:/);
  assert.ok(conditionalGatingIssues(practice(next).conditionalGatingRules, gatingChildren(next, p.clientKey)).length);
});
test("explicit rule edits are preserved and legacy full paths are repaired once on hydration", () => {
  const d = fixture(), next = structuredClone(d), p = practice(next);
  clause(next).selection = { codes: [gatingChildren(next, p.clientKey)[1].code] };
  assert.deepEqual(repairConditionalReferences(d, next), next);
  next.dimensions[0].code = "DIM"; next.dimensions[0].modules[0].code = "MOD"; p.code = "PRACTICE";
  p.questions[0].code = "FIRST"; p.questions[1].code = "SECOND";
  clause(next).selection.codes = ["DIM.MOD.PRACTICE.FIRST"];
  clause(next).where.conditions[0].right = { kind: "field", code: "DIM.MOD.PRACTICE.SECOND", field: "score" };
  const hydrated = hydrateDocument(next, false), paths = gatingIndex(hydrated).byKey;
  assert.equal(clause(hydrated).selection.codes![0], paths.get(p.questions[0].clientKey));
  const right = clause(hydrated).where.conditions[0].right;
  assert.equal(right.kind === "field" && right.code, paths.get(p.questions[1].clientKey));
});
test("reverting order restores full references by identity after prefix swaps", () => {
  const baseline = fixture(), p = practice(baseline);
  const current = apply(baseline, moveQuestion(baseline, p.clientKey, p.questions[0].clientKey, 1));
  const entry = compareDocuments(baseline, current).structure.find(e => e.status === "order")!;
  const restored = revertEditorChange(current, baseline, entry.id);
  assert.deepEqual(practice(restored).questions.map(q => q.clientKey), p.questions.map(q => q.clientKey));
  assert.deepEqual(practice(restored).conditionalGatingRules, p.conditionalGatingRules);
});
test("invalid scopes, duplicate selections, bad units and incompatible answer values block creation", () => {
  const d = fixture(), p = practice(d), options = gatingChildren(d, p.clientKey);
  for (const codes of [[p.questions[0].code], ["OTHER.M.P.Q"], [""], [options[0].code, options[0].code], []]) {
    const bad = structuredClone(p.conditionalGatingRules!); bad[0].when.conditions[0].selection.codes = codes;
    assert.ok(conditionalGatingIssues(bad, options).length);
  }
  for (const comparison of [{ kind: "comparison", field: "score", operator: ">", right: { kind: "literal", value: 70 } }, { kind: "comparison", field: "answer", operator: "==", right: { kind: "literal", value: 1 } }]) {
    const bad = structuredClone(p.conditionalGatingRules!); bad[0].when.conditions[0].where.conditions = [comparison as any];
    assert.ok(conditionalGatingIssues(bad, options).length);
  }
  assert.ok(conditionalGatingIssues([{ version: 1, effect: "flagForReview", when: { kind: "or", conditions: [] } } as unknown as ConditionalGatingRule], options).length);
});
test("choice identity survives hydration; deleting an answer option invalidates membership rules", () => {
  const d = fixture(), p = practice(d), q = p.questions[0]; q.type = "multiple_selection";
  q.choices = [{ id: "a", label: "First", score: 0, rawValue: 1 }, { id: "b", label: "Second", score: 0, rawValue: 2 }];
  clause(d).where.conditions = [{ kind: "comparison", field: "answer", operator: "containsAll", right: { kind: "literal", value: ["a", "b"] } }];
  assert.deepEqual(conditionalGatingIssues(p.conditionalGatingRules, gatingChildren(d, p.clientKey)), []);
  const hydrated = hydrateDocument(d, false);
  assert.equal(practice(hydrated).questions[0].choices![0].id, "a");
  practice(hydrated).questions[0].choices!.pop();
  assert.ok(conditionalGatingIssues(practice(hydrated).conditionalGatingRules, gatingChildren(hydrated, practice(hydrated).clientKey)).length);
});
