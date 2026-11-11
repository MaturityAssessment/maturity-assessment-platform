import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyDocument, emptyModule, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { moveModule, reorderModule, updateModule, deleteModule } from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
import { hasValidModulePrerequisiteOrder, visibleModuleDependents } from "../../../../src/app/maturity-models/editor/model/modulePrerequisites.ts";
import { validateDocument } from "../../../../src/app/maturity-models/editor/model/editorValidation.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { revertEditorChange } from "../../../../src/app/maturity-models/editor/model/editorRevert.ts";

function fixture() {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  dimension.modules = ["ALPHA", "BETA", "GAMMA", "INDEPENDENT"].map((name, index) => ({
    ...emptyModule(index + 1, 1, 1), name, code: `M0${index + 1}_${name}`,
  }));
  dimension.modules[1].prerequisiteModuleCodes = [dimension.modules[0].code];
  dimension.modules[2].prerequisiteModuleCodes = [dimension.modules[1].code];
  return { document, dimension, modules: dimension.modules };
}

test("arrow and drag reordering cannot move a dependent before a prerequisite or a prerequisite after its dependents", () => {
  const { document, dimension, modules } = fixture();
  assert.equal(moveModule(document, dimension.clientKey, modules[1].clientKey, -1), document);
  assert.equal(moveModule(document, dimension.clientKey, modules[0].clientKey, 1), document);
  assert.equal(reorderModule(document, dimension.clientKey, modules[0].clientKey, modules[3].clientKey), document);
  assert.equal(reorderModule(document, dimension.clientKey, modules[2].clientKey, modules[0].clientKey), document);
});

test("allowed reorder renumbers codes and preserves prerequisite identity", () => {
  const { document, dimension, modules } = fixture();
  const next = reorderModule(document, dimension.clientKey, modules[3].clientKey, modules[0].clientKey);
  const reordered = next.dimensions[0].modules;
  assert.deepEqual(reordered.map((module) => module.name), ["INDEPENDENT", "ALPHA", "BETA", "GAMMA"]);
  assert.deepEqual(reordered[2].prerequisiteModuleCodes, [reordered[1].code]);
  assert.deepEqual(reordered[3].prerequisiteModuleCodes, [reordered[2].code]);
  assert.equal(hasValidModulePrerequisiteOrder(reordered), true);
  assert.equal(document.dimensions[0].modules[0].name, "ALPHA");
  assert.equal(compareDocuments(document, next).structure.filter((entry) => entry.fields.some((field) => field.label === "Prerequisite modules")).length, 0);
});

test("renaming a prerequisite updates dependent references case-insensitively", () => {
  const { document, dimension, modules } = fixture();
  modules[1].prerequisiteModuleCodes = [modules[0].code.toLowerCase()];
  const next = updateModule(document, dimension.clientKey, modules[0].clientKey, { ...modules[0], code: "M01_RENAMED" });
  assert.deepEqual(next.dimensions[0].modules[1].prerequisiteModuleCodes, ["M01_RENAMED"]);
});

test("showing a dependent enables its whole prerequisite chain", () => {
  const { document, dimension, modules } = fixture();
  modules[0].visible = modules[1].visible = modules[2].visible = false;
  const next = updateModule(document, dimension.clientKey, modules[2].clientKey, { ...modules[2], visible: true });
  assert.ok(next.dimensions[0].modules.every((module) => module.visible !== false));
  assert.deepEqual(visibleModuleDependents(next.dimensions[0].modules, modules[0].code).map((module) => module.name), ["BETA"]);
});

test("referenced modules cannot be deleted even when their dependents are hidden", () => {
  const { document, dimension, modules } = fixture();
  modules[1].visible = false;
  assert.equal(deleteModule(document, dimension.clientKey, modules[0].clientKey), document);
});

test("hydration and serialization preserve prerequisites through prefix normalization", () => {
  const { document, modules } = fixture();
  modules[0].code = "LEGACY";
  modules[1].prerequisiteModuleCodes = ["legacy"];
  const hydrated = hydrateDocument(document, false);
  const payload = serializeDocument(hydrated);
  assert.deepEqual(payload.dimensions[0].modules[1].prerequisiteModuleCodes, [hydrated.dimensions[0].modules[0].code]);
});

test("invalid references, duplicates, forward dependencies and hidden prerequisites block saving", () => {
  const { document, modules } = fixture();
  const errors = () => validateDocument(document).filter((issue) => /prerequisite/.test(issue.message));
  for (const references of [["UNKNOWN"], [modules[1].code], [modules[2].code], [modules[0].code, modules[0].code.toLowerCase()]]) {
    modules[1].prerequisiteModuleCodes = references;
    assert.ok(errors().some((issue) => issue.severity === "error"));
  }
  modules[1].prerequisiteModuleCodes = [modules[0].code];
  modules[0].visible = false;
  assert.ok(errors().some((issue) => /visible prerequisites/.test(issue.message)));
});

test("reverting an order change cannot break prerequisites added after the reorder", () => {
  const { document: baseline, dimension, modules } = fixture();
  modules.forEach((module) => { module.prerequisiteModuleCodes = []; });
  const current = reorderModule(baseline, dimension.clientKey, modules[1].clientKey, modules[0].clientKey);
  current.dimensions[0].modules[1].prerequisiteModuleCodes = [current.dimensions[0].modules[0].code];
  const order = compareDocuments(baseline, current).structure.find((entry) => entry.status === "order")!;
  assert.throws(() => revertEditorChange(current, baseline, order.id), /No module can be reordered/);
});
