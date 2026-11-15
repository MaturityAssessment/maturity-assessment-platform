import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { validateDocument } from "../../../../src/app/maturity-models/editor/model/editorValidation.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { hasGatingThresholdIssues } from "../../../../src/app/maturity-models/editor/model/gatingRules.ts";

test("thresholds accept zero, equality endpoints and fractional percentages", () => {
  for (const value of [0, 12.345, 75, 100]) {
    assert.equal(hasGatingThresholdIssues({ minimumCoverage: value, minimumIncludedCount: value }), false);
  }
  for (const value of [-1, 100.01, NaN, Infinity]) {
    assert.equal(hasGatingThresholdIssues({ minimumCoverage: value }), true);
    assert.equal(hasGatingThresholdIssues({ minimumIncludedCount: value }), true);
  }
});

test("invalid thresholds block saving and edits appear in change review", () => {
  const baseline = createEmptyDocument();
  const document = structuredClone(baseline);
  document.dimensions[0].minimumCoverage = 80;
  document.dimensions[0].modules[0].minimumIncludedCount = 101;
  assert.ok(validateDocument(document).some(issue => /gating/.test(issue.message) && issue.severity === "error"));
  const changes = compareDocuments(baseline, document).structure;
  assert.ok(changes.some(entry => entry.fields.some(field => field.label === "Minimum coverage (%)")));
  assert.ok(changes.some(entry => entry.fields.some(field => field.label === "Minimum included count (%)")));
});

test("child-state rules survive hydration/serialization and appear in review", async () => {
  const { hydrateDocument, serializeDocument } = await import("../../../../src/app/maturity-models/editor/model/editorDocument.ts");
  const baseline = createEmptyDocument();
  const current = structuredClone(baseline);
  current.dimensions[0].modules[0].childStateGatingRules = [{ quantifier: "no", state: "computed", effect: "withheld" }, { quantifier: "any", state: "withheld", effect: "flagForReview" }];
  const serialized = serializeDocument(hydrateDocument(current, false));
  assert.deepEqual(serialized.dimensions[0].modules[0].childStateGatingRules, current.dimensions[0].modules[0].childStateGatingRules);
  assert.ok(compareDocuments(baseline, current).structure.some(entry => entry.fields.some(field => field.label === "Child-state gating rules")));
  assert.equal(hasGatingThresholdIssues(current.dimensions[0].modules[0]), false);
  assert.equal(hasGatingThresholdIssues({ childStateGatingRules: [{ quantifier: "any", state: "flagForReview", effect: "withheld" }] } as any), true);
});
