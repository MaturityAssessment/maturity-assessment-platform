import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyDocument, emptyModule, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { updateModule, reorderModule, deleteModule } from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
import { getModuleBadges } from "../../../../src/app/maturity-models/editor/model/moduleBadges.ts";
import { compareDocuments } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { revertEditorChange } from "../../../../src/app/maturity-models/editor/model/editorRevert.ts";
import { buildOutlineTree } from "../../../../src/app/maturity-models/editor/model/outlineTree.ts";
import { moduleRelationshipIssues } from "../../../../src/app/maturity-models/editor/model/moduleRelationships.ts";

function fixture() {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  dimension.modules = ["ALPHA", "BETA", "GAMMA"].map((name, index) => ({ ...emptyModule(index + 1, 1, 1), code: `M0${index + 1}_${name}`, name }));
  return { document, dimension, modules: dimension.modules };
}

test("badges are directional notes and do not change visibility or impose mutex constraints", () => {
  const { document, dimension, modules } = fixture();
  modules[0].visible = false;
  modules[0].mutexModuleCodes = [modules[1].code];
  modules[1].mutexModuleCodes = [modules[0].code];
  const next = updateModule(document, dimension.clientKey, modules[0].clientKey, {
    ...modules[0], mandatoryBadge: true, reinforcesModuleCodes: [modules[1].code], substitutesModuleCodes: [modules[2].code],
  });
  const result = next.dimensions[0].modules;
  assert.deepEqual(result.map((module) => module.visible), [false, true, true]);
  assert.deepEqual(result[1].reinforcesModuleCodes ?? [], []);
  assert.deepEqual(result[2].substitutesModuleCodes ?? [], []);
  assert.deepEqual(result[0].prerequisiteModuleCodes, []);
  assert.equal(moduleRelationshipIssues(result).length, 0);
});

test("badges survive drafts and older documents default to no badges", () => {
  const { document, modules } = fixture();
  modules[0].mandatoryBadge = true;
  modules[0].reinforcesModuleCodes = [modules[1].code];
  modules[0].substitutesModuleCodes = [modules[2].code];
  const payload = serializeDocument(hydrateDocument(JSON.parse(JSON.stringify(document)), false));
  assert.equal(payload.dimensions[0].modules[0].mandatoryBadge, true);
  assert.deepEqual(payload.dimensions[0].modules[0].reinforcesModuleCodes, [modules[1].code]);
  assert.deepEqual(payload.dimensions[0].modules[0].substitutesModuleCodes, [modules[2].code]);
  delete modules[0].mandatoryBadge; delete modules[0].reinforcesModuleCodes; delete modules[0].substitutesModuleCodes;
  const legacy = hydrateDocument(document, false).dimensions[0].modules[0];
  assert.equal(legacy.mandatoryBadge, false);
  assert.deepEqual(legacy.reinforcesModuleCodes, []);
  assert.deepEqual(legacy.substitutesModuleCodes, []);
});

test("renaming and reordering targets preserve note identity without false review changes", () => {
  const { document, dimension, modules } = fixture();
  modules[0].reinforcesModuleCodes = [modules[1].code];
  modules[0].substitutesModuleCodes = [modules[2].code];
  const renamed = updateModule(document, dimension.clientKey, modules[1].clientKey, { ...modules[1], code: "M02_RENAMED", name: "Renamed target" });
  assert.deepEqual(renamed.dimensions[0].modules[0].reinforcesModuleCodes, ["M02_RENAMED"]);
  assert.equal(getModuleBadges(renamed.dimensions[0], renamed.dimensions[0].modules[0])[0].label, "Reinforces Renamed target");
  const reordered = reorderModule(renamed, dimension.clientKey, modules[2].clientKey, modules[0].clientKey);
  const [gamma, alpha, beta] = reordered.dimensions[0].modules;
  assert.deepEqual(alpha.reinforcesModuleCodes, [beta.code]);
  assert.deepEqual(alpha.substitutesModuleCodes, [gamma.code]);
  assert.equal(compareDocuments(renamed, reordered).structure.some((entry) => entry.fields.some((field) => /Reinforces|Substitutes/.test(field.label))), false);
});

test("annotation targets can be deleted without blocking and stale references are removed", () => {
  const { document, dimension, modules } = fixture();
  modules[0].reinforcesModuleCodes = [modules[1].code];
  modules[0].substitutesModuleCodes = [modules[1].code];
  const deleted = deleteModule(document, dimension.clientKey, modules[1].clientKey);
  assert.equal(deleted.dimensions[0].modules.length, 2);
  assert.deepEqual(deleted.dimensions[0].modules[0].reinforcesModuleCodes, []);
  assert.deepEqual(deleted.dimensions[0].modules[0].substitutesModuleCodes, []);
});

test("badge changes can be reviewed and reverted without modifying target modules", () => {
  const { document, dimension, modules } = fixture();
  const next = updateModule(document, dimension.clientKey, modules[0].clientKey, { ...modules[0], mandatoryBadge: true, reinforcesModuleCodes: [modules[1].code] });
  const entry = compareDocuments(document, next).structure.find((entry) => entry.id === modules[0].clientKey)!;
  assert.ok(entry.fields.some((field) => field.label === "Mandatory badge"));
  assert.ok(entry.fields.some((field) => field.label === "Reinforces"));
  const reverted = revertEditorChange(next, document, entry.id);
  assert.equal(reverted.dimensions[0].modules[0].mandatoryBadge, false);
  assert.deepEqual(reverted.dimensions[0].modules[0].reinforcesModuleCodes, []);
  assert.equal(compareDocuments(document, reverted).structure.length, 0);
});

test("display labels resolve targets but informational badges never enter the sidebar tree", () => {
  const { document, dimension, modules } = fixture();
  modules[0].mandatoryBadge = true;
  modules[0].reinforcesModuleCodes = [modules[1].code];
  modules[0].substitutesModuleCodes = [modules[2].code];
  assert.deepEqual(getModuleBadges(dimension, modules[0]).map((badge) => badge.label), ["Mandatory", "Reinforces BETA", "Substitutes GAMMA"]);
  assert.doesNotMatch(JSON.stringify(buildOutlineTree(document)), /mandatoryBadge|reinforcesModuleCodes|substitutesModuleCodes|Mandatory|Reinforces|Substitutes/);
});
