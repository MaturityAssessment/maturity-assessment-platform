import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { conditionalGatingIssues } from "../../../../src/app/maturity-models/editor/model/conditionalGating.ts";
import * as gatingRuleLabels from "../../../../src/app/maturity-models/editor/model/gatingRuleLabels.ts";
const require = createRequire(import.meta.url);
function harness() {
  let value: any[] = [{ version: 1, effect: "flagForReview", name: "Quality", when: { kind: "and", conditions: [{ kind: "children", quantifier: "every", selection: {}, where: { kind: "and", conditions: [{ kind: "comparison", field: "score", operator: "==", right: { kind: "literal", value: 0.7 } }] } }] } }];
  const options = [{ code: "D.M.P1", name: "First" }, { code: "D.M.P2", name: "Second" }];
  const exports: any = {};
  const source = readFileSync(new URL("../../../../src/app/maturity-models/editor/components/GatingConditionEditor.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  let active: any;
  const localRequire = (name: string) => {
    if (name === "react") return {
      useState: (initial: any) => [active ?? initial, (next: any) => { active = next; }],
      useRef: (initial: any) => ({ current: initial }), useEffect: () => {},
    };
    if (name === "../model/gatingRuleLabels") return gatingRuleLabels;
    if (name === "../model/conditionalGating") return { conditionalGatingIssues };
    if (name === "./FormFields") return { inputClass: "" };
    return require(name);
  };
  new Function("require", "exports", code)(localRequire, exports);
  let part = "selection";
  const render = () => exports.default({ condition: value[0].when.conditions[0], part, childOptions: options, childType: "practice", onChange: (next: any) => { value[0].when.conditions[0] = next; } });
  const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node: any): string => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : Array.isArray(node) ? node.map(text).join("") : text(node.props?.children);
  const find = (predicate: (node: any) => boolean) => { const node = nodes(render()).find(predicate); assert.ok(node); return node; };
  const click = (label: string) => {
    const button = find(node => node.type === "button" && (text(node) === label || node.props["aria-label"] === label));
    assert.ok(!button.props.disabled, label);
    button.props.onClick();
  };
  const select = (label: string, next: string) => find(node => node.type === "select" && node.props["aria-label"] === label).props.onChange({ target: { value: next } });
  const openComparisons = () => { part = "comparisons"; };
  return { click, select, find, openComparisons, current: () => value, options };
}
test("target buttons preserve the selection and store full reference identifiers", () => {
  const h = harness(); h.openComparisons(); h.click("Another practice");
  assert.equal(h.current()[0].when.conditions[0].quantifier, "every");
  assert.equal(h.current()[0].when.conditions[0].where.conditions[0].right.kind, "field");
  h.find(node => node.type?.name === "ReferenceField").props.onChange("D.M.P2");
  assert.deepEqual(h.current()[0].when.conditions[0].where.conditions[0].right, { kind: "field", field: "score", code: "D.M.P2" });
  assert.deepEqual(conditionalGatingIssues(h.current(), h.options), []);
  h.click("A value");
  assert.deepEqual(h.current()[0].when.conditions[0].where.conditions[0].right, { kind: "literal", value: 0.7 });
});
test("adding comparisons retains one selection and AND scope", () => {
  const h = harness(); h.openComparisons(); h.click("Add comparison to this group");
  assert.equal(h.current()[0].when.conditions.length, 1);
  assert.equal(h.current()[0].when.conditions[0].where.conditions.length, 2);
  h.click("Remove comparison 2 from condition 1");
  assert.equal(h.current()[0].when.conditions[0].where.conditions.length, 1);
});
test("changing a property clears incompatible references and uses suitable percentage defaults", () => {
  const h = harness(); h.openComparisons(); h.click("Another practice");
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

test("score controls display percentages while saving normalized values", () => {
  const h = harness(); h.openComparisons();
  const literal = h.find(node => node.type?.name === "LiteralInput");
  const control = literal.type(literal.props).props.children[0];
  assert.equal(control.props.value, 70);
  assert.equal(control.props.max, 100);
  control.props.onChange({ target: { valueAsNumber: 85 } });
  assert.equal(h.current()[0].when.conditions[0].where.conditions[0].right.value, 0.85);
});
