import test from "node:test";
import assert from "node:assert/strict";
import type { MaturityModel } from "../../../../src/api/types.ts";
import { visibleAssessmentModel } from "../../../../src/lib/moduleVisibility.ts";
import { createEmptyDocument, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { validateDocument } from "../../../../src/app/maturity-models/editor/model/editorValidation.ts";
import { moduleVisibilityDependencies } from "../../../../src/app/maturity-models/editor/model/moduleVisibility.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";

test("assessment projection removes hidden modules and empty dimensions without mutating the model", () => {
  const hidden = { name: "Hidden", visible: false, practices: [] };
  const legacy = { name: "Legacy", practices: [] };
  const model = { dimensions: [
    { name: "Mixed", modules: [hidden, legacy] },
    { name: "Excluded", modules: [hidden] },
  ] } as unknown as MaturityModel;
  const assessment = visibleAssessmentModel(model);
  assert.equal(assessment.dimensions.length, 1);
  assert.deepEqual(assessment.dimensions[0].modules, [legacy]);
  assert.equal(model.dimensions.length, 2);
  assert.equal(model.dimensions[0].modules.length, 2);
  assert.deepEqual(visibleAssessmentModel(assessment), assessment);
});

test("visibility defaults to true and false survives hydration and serialization", () => {
  const document = createEmptyDocument();
  const module = document.dimensions[0].modules[0];
  assert.equal(module.visible, true);
  delete module.visible;
  assert.equal(hydrateDocument(document, false).dimensions[0].modules[0].visible, true);
  module.visible = false;
  assert.equal(serializeDocument(hydrateDocument(document, false)).dimensions[0].modules[0].visible, false);
});

test("hidden explicit gating references block saving until the rule is fixed or visibility restored", () => {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  const module = dimension.modules[0];
  dimension.gatingRules = [{ order: 0, selection: "specificChild", childCode: module.code.toLowerCase(), operator: "<", threshold: 0.5, operation: "set", value: 0.2 }];
  const visibilityIssues = () => validateDocument(document).filter((issue) => /hidden module/.test(issue.message));
  module.visible = false;
  assert.equal(visibilityIssues().length, 1);
  assert.equal(visibilityIssues()[0].severity, "error");
  assert.equal(visibilityIssues()[0].selection?.key, dimension.clientKey);
  assert.match(moduleVisibilityDependencies(dimension, module)[0], /before saving/);
  module.visible = true;
  assert.equal(visibilityIssues().length, 0);
  module.visible = false;
  dimension.gatingRules = [];
  assert.equal(visibilityIssues().length, 0);
});

test("any/all gating rules alert the editor that their scope changes without creating invalid references", () => {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  const module = dimension.modules[0];
  module.visible = false;
  for (const selection of ["anyChild", "allChildren"] as const) {
    dimension.gatingRules = [{ order: 0, selection, operator: "<", threshold: 0.5, operation: "set", value: 0.2 }];
    assert.match(moduleVisibilityDependencies(dimension, module)[0], /only visible modules/);
    assert.equal(validateDocument(document).filter((issue) => /gating/i.test(issue.message)).length, 0);
  }
});


test("visibility changes appear in the version change review", () => {
  const baseline = createEmptyDocument();
  const current = structuredClone(baseline);
  current.dimensions[0].modules[0].visible = false;
  const changes = compareDocuments(baseline, current);
  assert.ok(changes.structure.some((entry) => entry.fields.some((field) => field.label === "Visible in assessments" && field.before === "Yes" && field.after === "No")));
});


test("hidden modules cannot be reached through assessment deep links", async () => {
  const { buildPracticeSteps, resolveAssessmentModuleLocation, resolveAssessmentPracticeLocation } = await import("../../../../src/app/assessment/assessmentRoutes.ts");
  const model = { dimensions: [{ id: "D1", name: "Dimension", modules: [{ code: "M1", visible: false, name: "Hidden", practices: [{ code: "P1", name: "Practice", questions: [] }] }] }] } as unknown as MaturityModel;
  assert.deepEqual(buildPracticeSteps(model), []);
  assert.equal(resolveAssessmentModuleLocation(model, "/assessment/D1/M1"), null);
  assert.equal(resolveAssessmentPracticeLocation(model, "/assessment/D1/M1/P1"), null);
});


test("hidden open-answer questions do not force manual evaluation", () => {
  const document = createEmptyDocument();
  const module = document.dimensions[0].modules[0];
  module.practices[0].questions[0].type = "open_answer";
  module.visible = false;
  assert.equal(validateDocument(document).filter((issue) => issue.field === "model-auto-evaluated").length, 0);
  module.visible = true;
  assert.equal(validateDocument(document).filter((issue) => issue.field === "model-auto-evaluated").length, 1);
});
