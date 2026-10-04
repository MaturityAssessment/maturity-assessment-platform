import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyDocument, emptyDimension, emptyModule, emptyPractice,
} from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import {
  deleteModule, deletePractice, reorderDimension, reorderModule, reorderPractice,
} from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
import {
  buildOutlineTree, filterOutline, flattenOutline, outlineReorderTarget,
} from "../../../../src/app/maturity-models/editor/model/outlineTree.ts";

function fixture() {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  dimension.name = "Governance";
  dimension.modules = [emptyModule(1, 1, 1), emptyModule(2, 1, 1), emptyModule(3, 1, 1)];
  dimension.modules[0].name = "Security";
  dimension.modules[0].practices[0].name = "Policy ownership";
  dimension.modules[0].practices[0].code = "POLICY_CODE";
  document.dimensions.push(emptyDimension(2, 1, 1, 1));
  document.dimensions[1].name = "Operations";
  return document;
}

test("search finds names and codes case-insensitively and retains only matching ancestor paths", () => {
  const tree = buildOutlineTree(fixture());
  for (const query of [" ownership ", "policy_code"]) {
    const result = filterOutline(tree, query);
    assert.deepEqual(flattenOutline(result).map((node) => node.label), ["Governance", "Security", "Policy ownership"]);
  }
  assert.equal(filterOutline(tree, "unknown").length, 0);
  assert.equal(filterOutline(tree, "   "), tree);
  assert.equal(tree[0].children.length, 3, "search must not mutate the original tree");
  assert.equal(filterOutline(tree, "Governance")[0].children.length, 0);
});

test("drop positions distinguish before and after, including downward moves and no-op positions", () => {
  const tree = buildOutlineTree(fixture());
  const nodes = flattenOutline(tree);
  const [a, b, c] = tree[0].children;
  assert.equal(outlineReorderTarget(nodes, a.id, c.id, false)?.id, b.id);
  assert.equal(outlineReorderTarget(nodes, a.id, c.id, true)?.id, c.id);
  assert.equal(outlineReorderTarget(nodes, c.id, a.id, false)?.id, a.id);
  assert.equal(outlineReorderTarget(nodes, c.id, a.id, true)?.id, b.id);
  assert.equal(outlineReorderTarget(nodes, a.id, b.id, false), null);
  assert.equal(outlineReorderTarget(nodes, b.id, a.id, true), null);
  assert.equal(outlineReorderTarget(nodes, a.id, a.id, true), null);
});

test("drops cannot reparent elements, mix hierarchy levels, or target deleted elements", () => {
  const tree = buildOutlineTree(fixture());
  const nodes = flattenOutline(tree);
  const modelModule = tree[0].children[0];
  assert.equal(outlineReorderTarget(nodes, modelModule.id, tree[1].children[0].id, true), null);
  assert.equal(outlineReorderTarget(nodes, modelModule.id, modelModule.children[0].id, true), null);
  assert.equal(outlineReorderTarget(nodes, modelModule.id, "missing", false), null);
});

test("reordering dimensions, modules, and practices preserves descendants and original documents", () => {
  const document = fixture();
  const [first, second] = document.dimensions;
  const dimensions = reorderDimension(document, first.clientKey, second.clientKey);
  assert.equal(dimensions.dimensions[1], first);
  assert.equal(document.dimensions[0], first);

  const [a, b, c] = first.modules;
  const modules = reorderModule(document, first.clientKey, a.clientKey, c.clientKey);
  assert.deepEqual(modules.dimensions[0].modules, [b, c, a]);
  assert.equal(modules.dimensions[0].modules[2].practices, a.practices);
  assert.deepEqual(first.modules, [a, b, c]);

  const original = a.practices[0];
  const next = emptyPractice(2, 1);
  a.practices.push(next);
  const practices = reorderPractice(document, a.clientKey, original.clientKey, next.clientKey);
  assert.deepEqual(practices.dimensions[0].modules[0].practices, [next, original]);
  assert.equal(practices.dimensions[0].modules[0].practices[1].questions, original.questions);
  assert.deepEqual(a.practices, [original, next]);
});

test("deleting the last child exposes an empty parent while keeping sibling branches intact", () => {
  const document = fixture();
  const dimension = document.dimensions[1];
  const modelModule = dimension.modules[0];
  const practice = modelModule.practices[0];
  const noPractices = deletePractice(document, modelModule.clientKey, practice.clientKey);
  const emptyModuleNode = buildOutlineTree(noPractices)[1].children[0];
  assert.equal(emptyModuleNode.childCount, 0);
  assert.equal(emptyModuleNode.childLabel, "practice");
  const noModules = deleteModule(document, dimension.clientKey, modelModule.clientKey);
  const outline = buildOutlineTree(noModules);
  assert.equal(outline[1].childCount, 0);
  assert.equal(outline[1].childLabel, "module");
  assert.equal(outline[0].children.length, 3);
});
