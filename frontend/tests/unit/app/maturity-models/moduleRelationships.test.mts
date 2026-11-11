import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEmptyDocument, emptyModule, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { updateModule, reorderModule, deleteModule } from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
import { moduleRelationshipIssues, normalizeModuleRelationships, planModuleVisibility } from "../../../../src/app/maturity-models/editor/model/moduleRelationships.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { revertEditorChange } from "../../../../src/app/maturity-models/editor/model/editorRevert.ts";
import type { ModelEditorModule } from "../../../../src/api/types.ts";

function fixture() {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  dimension.modules = ["A", "B", "C", "D"].map((name, index) => ({ ...emptyModule(index + 1, 1, 1), name, code: `M0${index + 1}_${name}`, visible: false }));
  return { document, dimension, modules: dimension.modules };
}

test("shared fixtures agree with backend validation", () => {
  const fixtures = JSON.parse(readFileSync(new URL("../../../../../tests/fixtures/module-relationships.json", import.meta.url), "utf8")) as Array<{ name: string; modules: ModelEditorModule[]; error: string | null }>;
  for (const fixture of fixtures) {
    const issues = moduleRelationshipIssues(fixture.modules);
    assert.equal(issues.length > 0, fixture.error !== null, fixture.name);
    if (fixture.error === "CONFLICTING_MODULE_RELATIONSHIPS") assert.ok(issues.some((issue) => issue.kind === "structure" && /Visibility paths/.test(issue.message)), fixture.name);
  }
});

test("co-requisite selections are reciprocal and can be removed from either endpoint", () => {
  const { document, dimension, modules } = fixture();
  const added = updateModule(document, dimension.clientKey, modules[0].clientKey, { ...modules[0], coRequisiteModuleCodes: [modules[1].code] });
  assert.deepEqual(added.dimensions[0].modules[1].coRequisiteModuleCodes, [modules[0].code]);
  const removed = updateModule(added, dimension.clientKey, modules[1].clientKey, { ...added.dimensions[0].modules[1], coRequisiteModuleCodes: [] });
  assert.deepEqual(removed.dimensions[0].modules[0].coRequisiteModuleCodes, []);
  assert.deepEqual(removed.dimensions[0].modules[1].coRequisiteModuleCodes, []);
});

test("co-requisite visibility is transitive and includes prerequisite visibility", () => {
  const { modules } = fixture();
  modules[1].coRequisiteModuleCodes = [modules[2].code];
  modules[2].coRequisiteModuleCodes = [modules[3].code];
  modules[3].prerequisiteModuleCodes = [modules[0].code];
  const shown = planModuleVisibility(modules, modules[1].code, true);
  assert.ok(shown.every((module) => module.visible));
  const hidden = planModuleVisibility(shown, modules[2].code, false);
  assert.deepEqual(hidden.map((module) => module.visible), [true, false, false, false]);
  assert.ok(modules.every((module) => !module.visible), "input remains unchanged");
});

test("mutex switches hide the alternative's whole co-requisite group", () => {
  const { modules } = fixture();
  modules[0].mutexModuleCodes = [modules[1].code];
  modules[1].coRequisiteModuleCodes = [modules[2].code];
  modules[1].visible = modules[2].visible = true;
  const next = planModuleVisibility(modules, modules[0].code, true);
  assert.deepEqual(next.map((module) => module.visible), [true, false, false, false]);
  assert.deepEqual(planModuleVisibility(next, modules[0].code, false).map((module) => module.visible), [false, false, false, false]);
});

test("switches cannot hide prerequisites needed by other visible modules", () => {
  const { modules } = fixture();
  modules[0].mutexModuleCodes = [modules[1].code];
  modules[2].prerequisiteModuleCodes = [modules[1].code];
  modules[1].visible = modules[2].visible = true;
  assert.throws(() => planModuleVisibility(modules, modules[0].code, true), /Hide dependent modules first/);
  assert.throws(() => planModuleVisibility(modules, modules[1].code, false), /still requires/);
});

test("alternative modules can share a prerequisite without hiding it during a switch", () => {
  const { modules } = fixture();
  modules[1].prerequisiteModuleCodes = [modules[0].code];
  modules[2].prerequisiteModuleCodes = [modules[0].code];
  modules[1].mutexModuleCodes = [modules[2].code];
  modules[0].visible = modules[1].visible = true;
  assert.equal(moduleRelationshipIssues(modules).length, 0);
  assert.deepEqual(planModuleVisibility(modules, modules[2].code, true).map((module) => module.visible), [true, false, true, false]);
});

test("mutex remains pairwise rather than transitive", () => {
  const { modules } = fixture();
  modules[0].mutexModuleCodes = [modules[1].code]; modules[1].mutexModuleCodes = [modules[2].code];
  const next = planModuleVisibility(planModuleVisibility(modules, modules[0].code, true), modules[2].code, true);
  assert.deepEqual(next.map((module) => module.visible), [true, false, true, false]);
});

test("renames, reorders, drafts and serialization preserve reciprocal relationship identity", () => {
  const { document, dimension, modules } = fixture();
  modules[0].coRequisiteModuleCodes = [modules[1].code]; modules[1].mutexModuleCodes = [modules[2].code];
  dimension.modules = normalizeModuleRelationships(modules);
  let next = updateModule(document, dimension.clientKey, modules[1].clientKey, { ...dimension.modules[1], code: "M02_RENAMED" });
  assert.deepEqual(next.dimensions[0].modules[0].coRequisiteModuleCodes, ["M02_RENAMED"]);
  assert.deepEqual(next.dimensions[0].modules[2].mutexModuleCodes, ["M02_RENAMED"]);
  const baseline = structuredClone(next);
  next = reorderModule(next, dimension.clientKey, modules[3].clientKey, modules[0].clientKey);
  assert.equal(compareDocuments(baseline, next).structure.some((entry) => entry.fields.some((field) => /Co-requisite|Mutually exclusive/.test(field.label))), false);
  const payload = serializeDocument(hydrateDocument(JSON.parse(JSON.stringify(next)), false));
  assert.deepEqual(payload.dimensions[0].modules[1].coRequisiteModuleCodes, [payload.dimensions[0].modules[2].code]);
});

test("deleting and reverting relationship edits clean up both endpoints", () => {
  const { document, dimension, modules } = fixture();
  const added = updateModule(document, dimension.clientKey, modules[0].clientKey, { ...modules[0], mutexModuleCodes: [modules[1].code] });
  const reverted = revertEditorChange(added, document, modules[0].clientKey);
  assert.deepEqual(reverted.dimensions[0].modules[0].mutexModuleCodes, []);
  assert.deepEqual(reverted.dimensions[0].modules[1].mutexModuleCodes, []);
  const deleted = deleteModule(added, dimension.clientKey, modules[0].clientKey);
  assert.deepEqual(deleted.dimensions[0].modules[0].mutexModuleCodes, []);
});

test("combined graph validation agrees with exhaustive visibility assignments", () => {
  let seed = 67483;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let sample = 0; sample < 160; sample++) {
    const { modules } = fixture();
    for (let i = 0; i < modules.length; i++) for (let j = i + 1; j < modules.length; j++) {
      if (random() < 0.3) modules[j].prerequisiteModuleCodes!.push(modules[i].code);
      if (random() < 0.2) modules[i].coRequisiteModuleCodes!.push(modules[j].code);
      if (random() < 0.2) modules[i].mutexModuleCodes!.push(modules[j].code);
    }
    const possible = new Set<number>();
    for (let mask = 0; mask < 16; mask++) {
      const visible = (code: string) => Boolean(mask & (1 << modules.findIndex((module) => module.code === code)));
      const valid = modules.every((module) =>
        (module.prerequisiteModuleCodes ?? []).every((code) => !visible(module.code) || visible(code)) &&
        (module.coRequisiteModuleCodes ?? []).every((code) => visible(module.code) === visible(code)) &&
        (module.mutexModuleCodes ?? []).every((code) => !visible(module.code) || !visible(code)));
      if (valid) for (let index = 0; index < 4; index++) if (mask & (1 << index)) possible.add(index);
    }
    assert.equal(moduleRelationshipIssues(modules).some((issue) => issue.kind === "structure"), possible.size !== 4, `sample ${sample}`);
  }
});
