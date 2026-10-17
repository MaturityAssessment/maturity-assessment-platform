import test from "node:test";
import assert from "node:assert/strict";
import { compareDocuments, reconcileDocument } from "../../../../src/app/maturity-models/editor/model/editorChanges.ts";
import { createEmptyDocument, emptyQuestion, hydrateDocument, serializeDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { parseEditorDraft } from "../../../../src/app/maturity-models/editor/model/editorDraft.ts";
import { renumberSiblingCodes } from "../../../../src/app/maturity-models/editor/model/editorCodes.ts";
const practice = (d: ReturnType<typeof createEmptyDocument>) => d.dimensions[0].modules[0].practices[0];
const question = (d: ReturnType<typeof createEmptyDocument>) => practice(d).questions[0];

test("unchanged, whitespace-only and reverted documents have no entries", () => {
  const before = createEmptyDocument(); const after = structuredClone(before);
  assert.deepEqual(compareDocuments(before, after).counts, { added: 0, removed: 0, updated: 0, order: 0 });
  question(after).text = "  "; assert.equal(compareDocuments(before, after).structure.length, 0);
  question(after).text = "Changed"; question(after).text = question(before).text;
  assert.equal(compareDocuments(before, after).structure.length, 0);
  practice(after).questions.push(emptyQuestion(2)); practice(after).questions.pop();
  assert.equal(compareDocuments(before, after).structure.length, 0);
});
test("one wording edit produces one field, without ancestor changes", () => {
  const before = createEmptyDocument(); const after = structuredClone(before);
  question(after).text = "Is ownership documented?";
  const result = compareDocuments(before, after);
  assert.equal(result.structure.length, 1); assert.equal(result.counts.updated, 1);
  assert.deepEqual(result.structure[0].fields, [{ label: "Question text", before: "Not provided", after: "Is ownership documented?", beforeEmpty: true, afterEmpty: false }]);
});
test("added and removed branches are counted once with nested content", () => {
  const before = createEmptyDocument(); const after = structuredClone(before); after.dimensions = [];
  const result = compareDocuments(before, after);
  assert.equal(result.counts.removed, 1); assert.equal(result.structure[0].children?.length, 1);
  assert.equal(compareDocuments(after, before).counts.added, 1);
  assert.equal(compareDocuments(null, before).isNew, true);
});
test("reordering ignores numeric prefixes and rewritten dependency/gating references", () => {
  const before = createEmptyDocument(); const p = practice(before);
  p.questions.push({ ...emptyQuestion(2), dependsOnQuestionCode: p.questions[0].code, dependencyCondition: { type: "boolean", answers: [true] } });
  p.gatingRules = [{ order: 0, selection: "specificChild", childCode: p.questions[0].code, operator: ">", threshold: 0, operation: "set", value: 1 }];
  const after = structuredClone(before); const target = practice(after);
  const reordered = renumberSiblingCodes([...target.questions].reverse(), "Q", target.gatingRules);
  target.questions = reordered.items; target.gatingRules = reordered.gatingRules;
  const result = compareDocuments(before, after);
  assert.deepEqual(result.counts, { added: 0, removed: 0, updated: 0, order: 1 });
  target.questions.push(emptyQuestion(3));
  assert.equal(compareDocuments(before, after).counts.added, 1);
});
test("insertion shifts do not count as reordering; suffix edits do count", () => {
  const before = createEmptyDocument(); const after = structuredClone(before);
  practice(after).questions = renumberSiblingCodes([emptyQuestion(1), ...practice(after).questions], "Q").items;
  assert.deepEqual(compareDocuments(before, after).counts, { added: 1, removed: 0, updated: 0, order: 0 });
  question(before).code += "_CUSTOM";
  assert.equal(compareDocuments(before, after).counts.updated, 1);
});
test("all model settings are covered; inactive question fields and notes do not inflate counts", () => {
  const before = createEmptyDocument(); const after = structuredClone(before);
  after.name = "Model"; after.levels[0].name = "Starting";
  practice(after).requiresEvidence = true; question(after).required = true;
  question(after).rangeMax = 500; after.changelogMarkdown = "Release notes";
  const result = compareDocuments(before, after);
  assert.equal(result.overview.length, 1); assert.equal(result.scale.length, 1);
  assert.equal(result.structure.length, 2); assert.equal(result.counts.updated, 4);
  assert.equal(result.structure[1].fields.length, 1); assert.ok(result.releaseNotes);
  const notesOnly = structuredClone(before); notesOnly.changelogMarkdown = "Notes";
  assert.equal(compareDocuments(before, notesOnly).counts.updated, 0);
});
test("choices and dependency option identities normalize across imports", () => {
  const before = createEmptyDocument(); const p = practice(before);
  p.questions[0] = { ...p.questions[0], type: "multiple_choice", choices: [{ id: "old", label: "Yes", score: 1 }] };
  p.questions.push({ ...emptyQuestion(2), dependsOnQuestionCode: p.questions[0].code, dependencyCondition: { type: "multiple_choice", optionIds: ["old"] } });
  const after = structuredClone(before); question(after).choices![0].id = "new";
  practice(after).questions[1].dependencyCondition = { type: "multiple_choice", optionIds: ["new"] };
  assert.equal(compareDocuments(before, after).structure.length, 0);
  question(after).choices![0].score = 0;
  assert.equal(compareDocuments(before, after).structure[0].fields[0].label, "Choices");
});
test("imports match exact unique codes, prefer current identity and recover removed baseline items", () => {
  const before = createEmptyDocument(); const current = structuredClone(before);
  const imported = hydrateDocument(serializeDocument(before) as typeof before, true);
  assert.notEqual(question(imported).clientKey, question(before).clientKey);
  assert.equal(compareDocuments(before, reconcileDocument(imported, current, before)).structure.length, 0);
  practice(current).questions = [];
  assert.equal(question(reconcileDocument(imported, current, before)).clientKey, question(before).clientKey);
  question(imported).code = "Q01_NEW";
  const changed = compareDocuments(before, reconcileDocument(imported, current, before), "import");
  assert.equal(changed.counts.added, 1); assert.equal(changed.counts.removed, 1); assert.ok(changed.limitation);
  const duplicate = structuredClone(before); practice(duplicate).questions.push(structuredClone(question(duplicate)));
  const reconciled = reconcileDocument(duplicate, before, before);
  assert.notEqual(question(reconciled).clientKey, question(before).clientKey);
  assert.notEqual(practice(reconciled).questions[0].clientKey, practice(reconciled).questions[1].clientKey);
});
test("v2 draft round trip preserves baseline identities; legacy and incomplete metadata recover content", () => {
  const baseline = createEmptyDocument(); const document = structuredClone(baseline); question(document).text = "Changed";
  const saved = { version: 2, sourceModelId: "42", baseline, document, provenance: "source" };
  const parsed = parseEditorDraft(JSON.stringify(saved), "42");
  assert.ok(parsed?.version === 2);
  assert.equal(compareDocuments(parsed.baseline, parsed.document).counts.updated, 1);
  assert.equal(parseEditorDraft(JSON.stringify(saved), "43"), null);
  assert.equal(parseEditorDraft(JSON.stringify(document), "42")?.version, 1);
  assert.equal(parseEditorDraft(JSON.stringify({ ...saved, baseline: null }), "42")?.version, 1);
  assert.equal(parseEditorDraft(JSON.stringify({ ...saved, provenance: "unknown" }), "42")?.version, 1);
  assert.throws(() => parseEditorDraft("invalid", null));
});

test("storage failures return a persistence notice without changing the in-memory comparison", async () => {
  const { persistEditorDraft } = await import("../../../../src/app/maturity-models/editor/model/editorDraft.ts");
  const baseline = createEmptyDocument(); const document = structuredClone(baseline); question(document).text = "Changed";
  const draft = { version: 2 as const, sourceModelId: "42", baseline, document, provenance: "source" as const };
  const error = persistEditorDraft({ setItem() { throw new Error("Quota exceeded"); } }, "draft", draft);
  assert.match(error!, /could not be saved/);
  assert.equal(compareDocuments(baseline, document).counts.updated, 1);
  let saved = "";
  assert.equal(persistEditorDraft({ setItem(_key, value) { saved = value; } }, "draft", draft), null);
  assert.equal(parseEditorDraft(saved, "42")?.version, 2);
});
test("initialization and import preserve baseline; saved payload contains only working content", async () => {
  const { createInitialEditorState, editorReducer } = await import("../../../../src/app/maturity-models/editor/state/editorReducer.ts");
  const baseline = createEmptyDocument();
  let state = editorReducer(createInitialEditorState(true), { type: "initialize", baseline, document: structuredClone(baseline) });
  const imported = structuredClone(baseline); question(imported).text = "Imported";
  state = editorReducer(state, { type: "initialize", document: imported, dirty: true, provenance: "import" });
  assert.equal(state.baseline, baseline); assert.equal(state.dirty, true);
  assert.equal(question(baseline).text, "");
  const payload = serializeDocument(state.document!);
  assert.equal(payload.dimensions[0].modules[0].practices[0].questions[0].text, "Imported");
  assert.equal("baseline" in payload, false); assert.equal("clientKey" in payload.dimensions[0], false);
  assert.equal(editorReducer(state, { type: "clean" }).dirty, false);
});
test("gating, mappings and dependency-only edits remain visible", () => {
  const baseline = createEmptyDocument(); const document = structuredClone(baseline);
  document.dimensions[0].mappingRules[1].minimumScore = 0.3;
  practice(document).gatingRules = [{ order: 0, selection: "anyChild", operator: "<", threshold: 0.5, operation: "set", value: 0 }];
  question(document).dependsOnQuestionCode = "Q99_MISSING";
  const result = compareDocuments(baseline, document);
  assert.equal(result.counts.updated, 3);
  assert.ok(result.structure.flatMap(e => e.fields).some(f => f.after === "Q99_MISSING"));
});
test("blank added and removed scale levels still count as changes", () => {
  const baseline = createEmptyDocument(); const document = structuredClone(baseline);
  document.levels.push({ number: 6, name: "" });
  assert.equal(compareDocuments(baseline, document).counts.added, 1);
  assert.equal(compareDocuments(document, baseline).counts.removed, 1);
});

test("preview groups one question under muted ancestors without adding change entries", async () => {
  const { buildChangeTree } = await import("../../../../src/app/maturity-models/editor/model/editorChanges.ts");
  const baseline = createEmptyDocument();
  baseline.dimensions[0].name = "Governance / strategy";
  const document = structuredClone(baseline);
  question(document).text = "Updated question";
  const changes = compareDocuments(baseline, document);
  const tree = buildChangeTree(changes.structure);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].item?.name, "Governance / strategy");
  assert.equal(tree[0].entry, undefined);
  assert.equal(tree[0].children[0].item?.kind, "Module");
  const parent = tree[0].children[0].children[0];
  assert.equal(parent.item?.kind, "Practice");
  assert.equal(parent.entry, undefined);
  assert.equal(parent.children[0].entry?.fields[0].label, "Question text");
  assert.equal(changes.counts.updated, 1);
});

test("edited parents share their branch with changed and removed children", async () => {
  const { buildChangeTree } = await import("../../../../src/app/maturity-models/editor/model/editorChanges.ts");
  const baseline = createEmptyDocument();
  practice(baseline).questions.push(emptyQuestion(2));
  const document = structuredClone(baseline);
  document.dimensions[0].name = "Renamed dimension";
  practice(document).name = "Renamed practice";
  question(document).text = "Changed wording";
  practice(document).questions.pop();
  const changes = compareDocuments(baseline, document);
  const tree = buildChangeTree(changes.structure);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].entry?.status, "updated");
  const parent = tree[0].children[0].children[0];
  assert.equal(parent.entry?.status, "updated");
  assert.deepEqual(parent.children.map(node => node.entry?.status), ["updated", "removed"]);
  assert.equal(changes.counts.updated, 3);
  assert.equal(changes.counts.removed, 1);
});


test("empty field additions and clearances carry semantic presence without misclassifying literal placeholder text", () => {
  const baseline = createEmptyDocument();
  const document = structuredClone(baseline);
  question(document).help = "Not provided";
  const addition = compareDocuments(baseline, document).structure[0].fields[0];
  assert.equal(addition.beforeEmpty, true);
  assert.equal(addition.afterEmpty, false);
  const removal = compareDocuments(document, baseline).structure[0].fields[0];
  assert.equal(removal.beforeEmpty, false);
  assert.equal(removal.afterEmpty, true);
});

test("added and removed branches omit empty fields and collections but preserve false and zero", () => {
  const document = createEmptyDocument();
  question(document).weight = 0;
  question(document).help = "  ";
  for (const changes of [compareDocuments(null, document), compareDocuments(document, { ...document, dimensions: [] })]) {
    const dimension = changes.structure[0];
    assert.equal(dimension.fields.some(field => field.label === "Description"), false);
    assert.equal(dimension.fields.some(field => field.label === "Gating rules"), false);
    const fields = dimension.children![0].children![0].children![0].fields;
    assert.equal(fields.some(field => field.label === "Help text"), false);
    assert.equal(fields.some(field => field.label === "Question text"), false);
    const weight = fields.find(field => field.label === "Weight")!;
    assert.equal(weight.before || weight.after, "0");
    const required = fields.find(field => field.label === "Required")!;
    assert.equal(required.before || required.after, "No");
  }
});
