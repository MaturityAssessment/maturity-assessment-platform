import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { profilingPath, repairTargetReferences, targetProfileIssues, targetProfilesForComparison } from "../../../src/lib/targetProfiles.ts";
import { createEmptyDocument, hydrateDocument, serializeDocument } from "../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { compareDocuments } from "../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { revertEditorChange } from "../../../src/app/maturity-models/editor/model/editorRevert.ts";
import { editorReducer, createInitialEditorState } from "../../../src/app/maturity-models/editor/state/editorReducer.ts";
import type { TargetProfileConfiguration } from "../../../src/api/types.ts";

const fixture = JSON.parse(readFileSync(new URL("../../../../tests/fixtures/target-profiles.json", import.meta.url), "utf8"));
const configuration = (): TargetProfileConfiguration => structuredClone(fixture.configuration);
function document() {
  const value = createEmptyDocument();
  value.dimensions[0].code = "D1";
  value.dimensions[0].name = "Governance";
  value.dimensions[0].modules[0].code = "M1";
  value.dimensions[0].modules[0].name = "Management";
  value.targetProfiles = configuration();
  return value;
}
for (const route of fixture.routes) test("shared routing: " + route.name, () => {
  const result = profilingPath(configuration(), route.answers).selection;
  assert.equal(result.complete, route.complete);
  assert.equal(result.profileId, route.profileId);
  assert.deepEqual(result.answers, route.answers);
});
test("changing an upstream answer prunes later profiling answers", () => {
  const path = profilingPath(configuration(), { context: "small", regulation: "yes" });
  assert.deepEqual(path.selection.answers, { context: "small" });
  assert.equal(path.selection.profileId, "small-org");
  assert.deepEqual(profilingPath(configuration(), { context: "large", regulation: "deleted" }).selection.answers, { context: "large" });
});
test("configuration validation allows selected targets and detects invalid references", () => {
  const value = document();
  assert.deepEqual(targetProfileIssues(value), []);
  value.dimensions[0].modules[0].visible = false;
  assert.ok(targetProfileIssues(value).some(issue => issue.message.includes("hidden/missing")));
  value.targetProfiles!.profiles[0].requirements[0].minimumScore = Number.NaN;
  assert.ok(targetProfileIssues(value).some(issue => issue.message.includes("0%")));
  value.targetProfiles!.profiles[0].expectedLevel = -1;
  assert.ok(targetProfileIssues(value).some(issue => issue.message.includes("maturity level")));
});
test("cycles, missing destinations and disconnected questions prevent saving", () => {
  const value = document();
  value.targetProfiles!.questions[1].options[0].destination = { type: "question", id: "context" };
  assert.ok(targetProfileIssues(value).some(issue => issue.message.includes("cycle")));
  value.targetProfiles!.questions[1].options[0].destination = { type: "profile", id: "deleted" };
  assert.ok(targetProfileIssues(value).some(issue => issue.message.includes("missing profile")));
  value.targetProfiles!.rootQuestionId = "regulation";
  assert.ok(targetProfileIssues(value).some(issue => issue.message.includes("disconnected")));
});
test("empty requirements produce a warning rather than a blocking error", () => {
  const value = document();
  value.targetProfiles!.profiles[0].requirements = [];
  value.targetProfiles!.profiles[0].expectedLevel = null;
  assert.equal(targetProfileIssues(value)[0].severity, "warning");
});
test("renames, swaps and deletions preserve target item identities", () => {
  const before = document();
  const sibling = structuredClone(before.dimensions[0]);
  sibling.clientKey = "second-dimension"; sibling.code = "D2";
  before.dimensions.push(sibling);
  const after = structuredClone(before);
  after.dimensions[0].code = "D2";
  after.dimensions[0].modules[0].code = "M2";
  after.dimensions[1].code = "D1";
  const repaired = repairTargetReferences(before, after);
  assert.equal(repaired.targetProfiles!.profiles[0].requirements[0].dimensionCode, "D2");
  assert.equal(repaired.targetProfiles!.profiles[0].requirements[1].moduleCode, "M2");
  assert.deepEqual(targetProfilesForComparison(before), targetProfilesForComparison(repaired));
  after.dimensions.shift();
  const removed = repairTargetReferences(before, after);
  assert.match(removed.targetProfiles!.profiles[0].requirements[0].dimensionCode, /^missing_/);
});
test("hydration, serialization, drafts and change previews preserve profiling", () => {
  const before = hydrateDocument(document(), false);
  assert.deepEqual(serializeDocument(before).targetProfiles, before.targetProfiles);
  assert.deepEqual(hydrateDocument(JSON.parse(JSON.stringify(before)), false).targetProfiles, before.targetProfiles);
  const after = structuredClone(before);
  after.targetProfiles!.profiles[0].name = "Updated profile";
  const changes = compareDocuments(before, after);
  assert.ok(changes.structure.some(item => item.id === "profiles" && item.fields[0].after.includes("Updated profile")));
  assert.deepEqual(revertEditorChange(after, before, "profiles").targetProfiles, before.targetProfiles);
  const state = editorReducer({ ...createInitialEditorState(true), document: before }, { type: "replaceDocument", document: after });
  assert.equal(state.document!.targetProfiles!.profiles[0].name, "Updated profile");
  const renamed = structuredClone(before);
  renamed.dimensions[0].code = "D99";
  const next = editorReducer({ ...state, document: before }, { type: "replaceDocument", document: renamed });
  assert.equal(next.document!.targetProfiles!.profiles[0].requirements[0].dimensionCode, "D99");
  assert.ok(!compareDocuments(before, next.document!).structure.some(item => item.id === "profiles"));
});
