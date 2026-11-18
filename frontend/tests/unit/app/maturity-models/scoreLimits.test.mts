import test from "node:test";
import assert from "node:assert/strict";
import { scoreLimitIssues, scoreLimitLinked } from "../../../../src/app/maturity-models/editor/model/scoreLimits.ts";
import { createEmptyDocument, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { validateDocument } from "../../../../src/app/maturity-models/editor/model/editorValidation.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { gatingChildren, repairConditionalReferences } from "../../../../src/app/maturity-models/editor/model/conditionalGating.ts";
import type { ChildStateGatingRule, ScoreLimit } from "../../../../src/api/types.ts";

const flag: ChildStateGatingRule = { quantifier: "any", state: "computed", effect: "flagForReview", name: "Check" };
const limit: ScoreLimit = { kind: "ceiling", value: 0.555, childStateRule: flag };

test("links ignore key order, null metadata and rule order; edits, deletion and withhold rules invalidate them", () => {
  const snapshot = { name: "Check", description: null, effect: "flagForReview", state: "computed", quantifier: "any" } as unknown as ChildStateGatingRule;
  assert.equal(scoreLimitLinked({ ...limit, childStateRule: snapshot }, { childStateGatingRules: [{ ...flag, name: "Other" }, flag] }), true);
  for (const rule of [{ ...flag, name: "Renamed" }, { ...flag, quantifier: "every" as const }, { ...flag, effect: "withheld" as const }]) {
    assert.equal(scoreLimitLinked(limit, { childStateGatingRules: [rule] }), false);
  }
  assert.equal(scoreLimitLinked(limit, {}), false);
});

test("numeric limits validate independently of runtime conflicts", () => {
  const owner = { childStateGatingRules: [flag], scoreLimits: [limit] };
  assert.deepEqual(scoreLimitIssues(owner), []);
  for (const value of [0, 1, 0.555]) assert.deepEqual(scoreLimitIssues({ ...owner, scoreLimits: [{ ...limit, value }] }), []);
  for (const value of [-0.1, 1.01, NaN, Infinity, null]) assert.ok(scoreLimitIssues({ ...owner, scoreLimits: [{ ...limit, value } as ScoreLimit] }).length);
  assert.deepEqual(scoreLimitIssues({ ...owner, scoreLimits: [{ ...limit, kind: "floor", value: 0.9 }, { ...limit, value: 0.1 }] }), []);
  assert.ok(scoreLimitIssues({ ...owner, scoreLimits: Array(101).fill(limit) }).some(message => /100/.test(message)));
});

test("limits survive editor hydration and serialization at every scope and appear in change review", () => {
  const baseline = createEmptyDocument();
  const document = structuredClone(baseline);
  const dimension = document.dimensions[0], module = dimension.modules[0], practice = module.practices[0];
  for (const owner of [dimension, module, practice]) {
    owner.childStateGatingRules = [structuredClone(flag)]; owner.scoreLimits = [structuredClone(limit)];
  }
  const hydrated = hydrateDocument(document, false);
  const result = serializeDocument(hydrated);
  for (const owner of [result.dimensions[0], result.dimensions[0].modules[0], result.dimensions[0].modules[0].practices[0]]) {
    assert.deepEqual(owner.scoreLimits, [limit]);
  }
  hydrated.dimensions[0].scoreLimits![0].value = 0.2;
  assert.equal(document.dimensions[0].scoreLimits![0].value, 0.555);
  assert.ok(compareDocuments(baseline, document).structure.some(entry => entry.fields.some(field => field.label === "Score limits")));
  for (const owner of [dimension, module, practice]) owner.childStateGatingRules = [];
  const issues = validateDocument(document).filter(issue => /Score limit/.test(issue.message));
  assert.equal(issues.length, 3); assert.ok(issues.every(issue => issue.severity === "error"));
});

test("conditional snapshots are compared by complete rule definition", () => {
  const conditional = { version: 1, effect: "flagForReview", when: { kind: "and", conditions: [] } } as const;
  const linked = { kind: "floor", value: 0.4, conditionalRule: structuredClone(conditional) } as unknown as ScoreLimit;
  const owner = { conditionalGatingRules: [structuredClone(conditional)] } as any;
  assert.equal(scoreLimitLinked(linked, owner), true);
  assert.equal(scoreLimitLinked({ ...linked, childStateRule: flag }, owner), false);
  owner.conditionalGatingRules[0].when.conditions.push({ kind: "children" });
  assert.equal(scoreLimitLinked(linked, owner), false);
});

function importedDocument() {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0], module = dimension.modules[0], practice = module.practices[0];
  dimension.code = "GOVERNANCE"; module.code = "MANAGEMENT"; practice.code = "POLICY"; practice.questions[0].code = "ADOPTED";
  for (const owner of [dimension, module, practice]) {
    owner.conditionalGatingRules = [{ version: 1, effect: "flagForReview", name: "Check", when: { kind: "and", conditions: [{
      kind: "children", quantifier: "any", selection: { codes: [gatingChildren(document, owner.clientKey)[0].code] },
      where: { kind: "and", conditions: [{ kind: "comparison", field: "score", operator: "<", right: { kind: "literal", value: 1 } }] },
    }] } }];
    owner.scoreLimits = [{ kind: "ceiling", value: 0.6, conditionalRule: structuredClone(owner.conditionalGatingRules[0]) }];
  }
  return document;
}

test("loading legacy or imported codes preserves valid limits while keeping already stale links invalid", () => {
  const original = importedDocument(), before = structuredClone(original);
  const hydrated = hydrateDocument(original, false);
  assert.notEqual(hydrated.dimensions[0].code, original.dimensions[0].code);
  for (const owner of [hydrated.dimensions[0], hydrated.dimensions[0].modules[0], hydrated.dimensions[0].modules[0].practices[0]]) {
    assert.deepEqual(scoreLimitIssues(owner), []);
    assert.deepEqual(owner.scoreLimits![0].conditionalRule, owner.conditionalGatingRules![0]);
    assert.notEqual(owner.scoreLimits![0].conditionalRule, owner.conditionalGatingRules![0]);
  }
  assert.deepEqual(original, before);
  const stale = importedDocument();
  stale.dimensions[0].conditionalGatingRules![0].name = "Changed";
  assert.ok(scoreLimitIssues(hydrateDocument(stale, false).dimensions[0]).length);
});

test("explicit code edits invalidate limits and never rewrite their approval snapshots", () => {
  const before = hydrateDocument(importedDocument(), false), edited = structuredClone(before);
  edited.dimensions[0].code += "_RENAMED";
  const repaired = repairConditionalReferences(before, edited);
  for (const owner of [repaired.dimensions[0], repaired.dimensions[0].modules[0], repaired.dimensions[0].modules[0].practices[0]]) {
    assert.ok(scoreLimitIssues(owner).length);
  }
  assert.deepEqual(repaired.dimensions[0].scoreLimits, before.dimensions[0].scoreLimits);
});
