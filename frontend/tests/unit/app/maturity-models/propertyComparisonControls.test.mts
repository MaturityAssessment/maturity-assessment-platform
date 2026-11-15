import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { conditionalGatingIssues } from "../../../../src/app/maturity-models/editor/model/conditionalGating.ts";
const require = createRequire(import.meta.url);
function harness() {
  let value: any[] = [{ version: 1, effect: "flagForReview", name: "Quality", when: { kind: "and", conditions: [{ kind: "children", quantifier: "every", selection: {}, where: { kind: "and", conditions: [{ kind: "comparison", field: "score", operator: "==", right: { kind: "literal", value: 0.7 } }] } }] } }];
  const options = [{ code: "D.M.P1", name: "First" }, { code: "D.M.P2", name: "Second" }];
  const exports: any = {};
  const source = readFileSync(new URL("../../../../src/app/maturity-models/editor/components/ConditionalGatingField.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = (name: string) => name.includes("conditionalGating") ? { conditionalGatingIssues } : name === "./FormFields" ? { inputClass: "" } : require(name);
  new Function("require", "exports", code)(localRequire, exports);
  const render = () => exports.default({ value, childOptions: options, childType: "practice", embedded: true, onChange: (next: any[]) => { value = next; } });
  const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node: any): string => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : Array.isArray(node) ? node.map(text).join("") : text(node.props?.children);
  const find = (predicate: (node: any) => boolean) => { const node = nodes(render()).find(predicate); assert.ok(node); return node; };
  const click = (label: string) => find(node => node.type === "button" && (text(node) === label || node.props["aria-label"] === label)).props.onClick();
  const select = (label: string, next: string) => find(node => node.type === "select" && node.props["aria-label"] === label).props.onChange({ target: { value: next } });
  return { click, select, find, current: () => value, options };
}
test("target buttons preserve the selection and store full reference identifiers", () => {
  const h = harness(); h.click("Another practice");
  assert.equal(h.current()[0].when.conditions[0].quantifier, "every");
  assert.equal(h.current()[0].when.conditions[0].where.conditions[0].right.kind, "field");
  h.find(node => node.type?.name === "ReferenceField").props.onChange("D.M.P2");
  assert.deepEqual(h.current()[0].when.conditions[0].where.conditions[0].right, { kind: "field", field: "score", code: "D.M.P2" });
  assert.deepEqual(conditionalGatingIssues(h.current(), h.options), []);
  h.click("A value");
  assert.deepEqual(h.current()[0].when.conditions[0].where.conditions[0].right, { kind: "literal", value: 0.7 });
});
test("comparison and group actions keep the two AND scopes independent", () => {
  const h = harness(); h.click("Add comparison for this child");
  assert.equal(h.current()[0].when.conditions.length, 1);
  assert.equal(h.current()[0].when.conditions[0].where.conditions.length, 2);
  h.click("Remove comparison 2 from condition 1");
  assert.equal(h.current()[0].when.conditions[0].where.conditions.length, 1);
  h.click("AND — add selection condition");
  assert.equal(h.current()[0].when.conditions.length, 2);
  assert.equal(h.current()[0].when.conditions[1].where.conditions.length, 1);
  h.click("Remove selection condition 2");
  assert.equal(h.current()[0].when.conditions.length, 1);
  assert.equal(h.current()[0].name, "Quality");
});
test("changing a property clears incompatible references and uses suitable percentage defaults", () => {
  const h = harness(); h.click("Another practice");
  h.select("Condition 1 comparison 1 property", "state");
  assert.deepEqual(h.current()[0].when.conditions[0].where.conditions[0], { kind: "comparison", field: "state", operator: "is", right: { kind: "literal", value: "computed" } });
  h.select("Condition 1 comparison 1 property", "coverage");
  assert.deepEqual(h.current()[0].when.conditions[0].where.conditions[0].right, { kind: "literal", value: 70 });
  assert.deepEqual(conditionalGatingIssues(h.current(), h.options), []);
});
test("specific-child choices store complete paths and require a nonempty selection", () => {
  const h = harness(); h.select("Condition 1 selection", "specific");
  assert.ok(conditionalGatingIssues(h.current(), h.options).length);
  h.find(node => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: true } });
  assert.deepEqual(h.current()[0].when.conditions[0].selection.codes, ["D.M.P1"]);
  assert.deepEqual(conditionalGatingIssues(h.current(), h.options), []);
});
