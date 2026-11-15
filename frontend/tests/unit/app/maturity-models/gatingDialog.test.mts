import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as React from "react";
import { conditionalGatingIssues } from "../../../../src/app/maturity-models/editor/model/conditionalGating.ts";
const require = createRequire(import.meta.url);
// Exercise modal state transitions and event handlers without depending on a browser's layout implementation.
function harness(initial: any = {}) {
  const cells: any[] = []; let cursor = 0; const changes: any[] = [];
  let props = { idPrefix: "p", aggregationRule: "WEIGHTED_AVERAGE", isPractice: true, childType: "question", minimumCoverage: 0, minimumIncludedCount: 0, childOptions: [{ code: "D.M.P.Q", name: "Question", question: { type: "boolean" } }], ...initial, onChange: (value: any) => { changes.push(value); props = { ...props, ...value }; } };
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(new URL("../../../../src/app/maturity-models/editor/components/GatingRuleField.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = (name: string) => name === "react" ? { ...React, useState: (initial: any) => { const index = cursor++; if (!(index in cells)) cells[index] = initial; return [cells[index], (value: any) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }]; } } : name === "./CompletionThresholdFields" ? { __esModule: true, default: "completion-thresholds" } : name === "./ConditionalGatingField" ? { __esModule: true, default: "conditions-editor" } : name.includes("conditionalGating") ? { conditionalGatingIssues } : name === "./FormFields" ? { inputClass: "", labelClass: "" } : name === "@headlessui/react" ? { Dialog: "dialog", DialogPanel: "dialog-panel", DialogTitle: "dialog-title" } : require(name);
  new Function("require", "exports", code)(localRequire, exports);
  const render = () => { cursor = 0; return exports.default(props); };
  const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = (node: any): string => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : Array.isArray(node) ? node.map(text).join("") : text(node.props?.children);
  const find = (predicate: (node: any) => boolean) => { const found = nodes(render()).find(predicate); assert.ok(found); return found; };
  const button = (label: string) => find(n => n.type === "button" && (text(n) === label || n.props["aria-label"] === label));
  const click = (label: string) => { const b = button(label); assert.ok(!b.props.disabled, label); b.props.onClick(); };
  const input = (placeholder: string, value: string) => find(n => n.type === "input" && n.props.placeholder === placeholder).props.onChange({ target: { value } });
  return { changes, render, find, button, click, input, text, setDescription: (value: string) => find(n => n.type === "textarea").props.onChange({ target: { value } }) };
}
test("creation requires a name, progresses in steps, and commits metadata only on Save", () => {
  const h = harness(); h.click("Create rule");
  assert.equal(h.button("Continue").props.disabled, true);
  h.input("e.g. Flag incomplete practices", "Quality check"); h.setDescription("Review weak answers");
  h.click("Continue"); assert.equal(h.changes.length, 0);
  assert.ok(h.find(n => n.type === "conditions-editor"));
  h.click("Continue"); assert.match(h.text(h.render()), /Quality check/);
  h.click("Save rule"); assert.equal(h.changes.length, 1);
  assert.equal(h.changes[0].conditionalGatingRules[0].name, "Quality check");
  assert.equal(h.changes[0].conditionalGatingRules[0].description, "Review weak answers");
  assert.equal(h.find(n => n.type === "dialog").props.open, false);
});
test("cancelled edits leave existing rule objects untouched", () => {
  const rule = { name: "Original", description: "Keep", quantifier: "any", state: "computed", effect: "flagForReview" };
  const h = harness({ childStateGatingRules: [rule] }); h.click("Edit Original");
  h.input("e.g. Flag incomplete practices", "Discard this"); h.setDescription("Discard"); h.click("Cancel");
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
  h.input("e.g. Flag incomplete practices", "Quality check"); h.click("Continue");
  const editor = h.find(n => n.type === "conditions-editor");
  const rules = structuredClone(editor.props.value); rules[0].when.conditions[0].where.conditions[0].right.value = 101;
  editor.props.onChange(rules);
  assert.equal(h.button("Continue").props.disabled, true);
  h.click("Cancel"); assert.equal(h.changes.length, 0);
});

test("simple state rule creation retains naming and uses the same save flow", () => {
  const h = harness(); h.click("Create rule"); h.input("e.g. Flag incomplete practices", "State check");
  h.find(n => n.type === "button" && h.text(n).startsWith("Check child states")).props.onClick();
  h.click("Continue"); h.click("Continue"); h.click("Save rule");
  assert.equal(h.changes[0].childStateGatingRules[0].name, "State check");
});
