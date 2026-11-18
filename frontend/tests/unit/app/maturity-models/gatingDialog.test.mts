import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as React from "react";
import { conditionalGatingIssues } from "../../../../src/app/maturity-models/editor/model/conditionalGating.ts";
import * as gatingRuleLabels from "../../../../src/app/maturity-models/editor/model/gatingRuleLabels.ts";
const require = createRequire(import.meta.url);
// Exercise modal state transitions and event handlers without depending on a browser's layout implementation.
function harness(initial: any = {}) {
  const cells: any[] = []; let cursor = 0; const changes: any[] = [];
  let props = { idPrefix: "p", aggregationRule: "WEIGHTED_AVERAGE", isPractice: true, childType: "question", minimumCoverage: 0, minimumIncludedCount: 0, childOptions: [{ code: "D.M.P.Q", name: "Question", question: { type: "boolean" } }], ...initial, onChange: (value: any) => { changes.push(value); props = { ...props, ...value }; } };
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(new URL("../../../../src/app/maturity-models/editor/components/GatingRuleField.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = (name: string) => {
    if (name === "react") return { ...React, useState: (initial: any) => {
      const index = cursor++;
      if (!(index in cells)) cells[index] = initial;
      return [cells[index], (value: any) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }];
    } };
    if (name === "./CompletionThresholdFields") return { __esModule: true, default: "completion-thresholds" };
    if (name === "./ConditionalGatingField") return {
      __esModule: true, default: "conditions-editor",
      emptyCondition: () => ({ kind: "children", quantifier: "any", selection: {}, where: { kind: "and", conditions: [] } }),
    };
    if (name === "../model/gatingRuleLabels") return gatingRuleLabels;
    if (name === "../model/conditionalGating") return { conditionalGatingIssues };
    if (name === "./FormFields") return { inputClass: "", labelClass: "" };
    if (name === "@headlessui/react") return {
      Dialog: "dialog", DialogPanel: "dialog-panel", DialogTitle: "dialog-title",
      Tab: "tab", TabGroup: "tab-group", TabList: "tab-list", TabPanel: "tab-panel", TabPanels: "tab-panels",
    };
    return require(name);
  };
  new Function("require", "exports", code)(localRequire, exports);
  const render = () => { cursor = 0; return exports.default(props); };
  const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node: any): string => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : Array.isArray(node) ? node.map(text).join("") : text(node.props?.children);
  const find = (predicate: (node: any) => boolean) => { const found = nodes(render()).find(predicate); assert.ok(found); return found; };
  const button = (label: string) => find(n => n.type === "button" && (text(n) === label || n.props["aria-label"] === label));
  const click = (label: string) => { const b = button(label); assert.ok(!b.props.disabled, label); b.props.onClick(); };
  const input = (placeholder: string, value: string) => find(n => n.type === "input" && (n.props.placeholder === placeholder || n.props["aria-label"] === placeholder)).props.onChange({ target: { value } });
  const compareWith = (value: number) => {
    const editor = find(n => n.type === "conditions-editor");
    const rules = structuredClone(editor.props.value);
    rules[0].when.conditions[0].where.conditions = [{ kind: "comparison", field: "score", operator: ">", right: { kind: "literal", value } }];
    editor.props.onChange(rules);
  };
  return { changes, render, find, button, click, input, text, compareWith, setDescription: (value: string) => { if (!nodes(render()).some(n => n.type === "textarea")) click("+ Add description"); find(n => n.type === "textarea").props.onChange({ target: { value } }); } };
}
test("header editing and pool lanes commit only on Save", () => {
  const h = harness(); h.click("Create rule");
  assert.equal(h.button("Save rule").props.disabled, true);
  assert.doesNotMatch(h.text(h.render()), /Preview|Continue/);
  h.input("Rule name", "Quality check"); h.setDescription("Review weak answers");
  h.compareWith(0.8);
  const editor = h.find(n => n.type === "conditions-editor");
  const rules = structuredClone(editor.props.value);
  rules[0].effect = "withheld"; editor.props.onChange(rules);
  assert.equal(h.changes.length, 0);
  h.click("Save rule");
  const rule = h.changes[0].conditionalGatingRules[0];
  assert.equal(rule.name, "Quality check"); assert.equal(rule.effect, "withheld");
  assert.equal(rule.description, "Review weak answers");
  assert.equal(rule.when.conditions[0].where.conditions[0].right.value, 0.8);
});
test("cancelled edits leave existing rule objects untouched", () => {
  const rule = { name: "Original", description: "Keep", quantifier: "any", state: "computed", effect: "flagForReview" };
  const h = harness({ childStateGatingRules: [rule] }); h.click("Edit Original");
  h.input("Rule name", "Discard this"); h.setDescription("Discard"); h.click("Cancel");
  assert.equal(h.changes.length, 0); assert.equal(rule.name, "Original"); assert.equal(rule.description, "Keep");
});
test("threshold updates are independent of the custom-rule dialog and preserve rules and metadata", () => {
  const original = { name: "State rule", quantifier: "any", state: "computed", effect: "flagForReview" };
  const h = harness({ aggregationRule: "MINIMUM", minimumCoverage: 80, childStateGatingRules: [original], completionGatingMetadata: { name: "Earlier title" } });
  const thresholds = h.find(n => n.type === "completion-thresholds");
  assert.equal(thresholds.props.minimumCoverage, 80);
  thresholds.props.onChange({ minimumCoverage: 80, minimumIncludedCount: 60 });
  assert.equal(h.changes[0].minimumIncludedCount, 60);
  assert.equal(h.changes[0].childStateGatingRules[0], original);
  assert.equal(h.changes[0].completionGatingMetadata.name, "Earlier title");
  assert.equal(h.find(n => n.type === "dialog").props.open, false);
});
test("invalid custom conditions block progression without changing thresholds", () => {
  const h = harness({ minimumCoverage: 80 }); h.click("Create rule");
  h.input("Rule name", "Quality check");
  h.compareWith(101);
  assert.equal(h.button("Save rule").props.disabled, true);
  h.click("Cancel"); assert.equal(h.changes.length, 0);
});

test("existing child-state rules retain their save format through lane editing", () => {
  const original = { name: "State check", quantifier: "every", state: "computed", effect: "flagForReview" };
  const h = harness({ childStateGatingRules: [original] }); h.click("Edit State check");
  const editor = h.find(n => n.type === "conditions-editor");
  assert.equal(editor.props.legacyState, true);
  const rules = structuredClone(editor.props.value);
  rules[0].when.conditions[0].quantifier = "no";
  editor.props.onChange(rules); h.click("Save rule");
  assert.equal(h.changes[0].childStateGatingRules[0].quantifier, "no");
  assert.equal(h.changes[0].childStateGatingRules[0].state, "computed");
  assert.equal(original.quantifier, "every");
});
