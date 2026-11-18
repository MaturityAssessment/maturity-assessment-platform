import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as limits from "../../../../src/app/maturity-models/editor/model/scoreLimits.ts";

const require = createRequire(import.meta.url);
const exports: any = {};
const code = ts.transpileModule(readFileSync(new URL("../../../../src/app/maturity-models/editor/components/ScoreLimitFields.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("require", "exports", code)((name: string) => name === "../model/scoreLimits.ts" ? limits : name === "./FormFields" ? { inputClass: "" } : require(name), exports);
const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const flag = { name: "Check", quantifier: "any", state: "computed", effect: "flagForReview" };

test("creator can add, edit, repair and remove a limit without silently updating its approved rule", () => {
  let owner: any = { childStateGatingRules: [structuredClone(flag)], scoreLimits: [] };
  const render = () => nodes(exports.default({ owner, onChange: (scoreLimits: any) => { owner = { ...owner, scoreLimits }; } }));
  const named = (name: string) => render().find(node => node.props?.["aria-label"] === name)!;
  render().find(node => node.type === "button" && node.props.children === "Add score limit")!.props.onClick();
  assert.equal(owner.scoreLimits.length, 1);
  named("Score limit 1 type").props.onChange({ target: { value: "floor" } });
  named("Score limit 1 value").props.onChange({ target: { value: "0.655" } });
  assert.equal(owner.scoreLimits[0].kind, "floor"); assert.equal(owner.scoreLimits[0].value, 0.655);
  owner.childStateGatingRules[0].name = "Changed";
  assert.equal(owner.scoreLimits[0].childStateRule.name, "Check");
  assert.equal(named("Score limit 1 rule").props.value, "");
  assert.ok(render().some(node => node.props?.role === "alert" && /changed or was removed/.test(node.props.children)));
  named("Score limit 1 rule").props.onChange({ target: { value: "0" } });
  assert.deepEqual(limits.scoreLimitIssues(owner), []);
  assert.equal(owner.scoreLimits[0].childStateRule.name, "Changed");
  named("Score limit 1 value").props.onChange({ target: { value: "" } });
  assert.ok(limits.scoreLimitIssues(owner).length);
  named("Remove score limit 1").props.onClick();
  assert.deepEqual(owner.scoreLimits, []);
});

test("withhold rules cannot be selected as limit triggers", () => {
  const rendered = nodes(exports.default({ owner: { childStateGatingRules: [{ ...flag, effect: "withheld" }] }, onChange() {} }));
  assert.equal(rendered.find(node => node.type === "button" && node.props.children === "Add score limit")!.props.disabled, true);
});

test("relinking across rule types clears the previous reference and preserves independent limit values", () => {
  const conditional = { version: 1, effect: "flagForReview", name: "Conditional", when: { kind: "and", conditions: [] } };
  let owner: any = { childStateGatingRules: [structuredClone(flag)], conditionalGatingRules: [conditional],
    scoreLimits: [{ kind: "floor", value: 0.7, childStateRule: structuredClone(flag) }, { kind: "ceiling", value: 0.9, childStateRule: structuredClone(flag) }] };
  const render = () => nodes(exports.default({ owner, onChange: (scoreLimits: any) => { owner = { ...owner, scoreLimits }; } }));
  const ruleSelector = () => render().find(node => node.props?.["aria-label"] === "Score limit 1 rule")!;
  ruleSelector().props.onChange({ target: { value: "1" } });
  assert.equal(owner.scoreLimits[0].childStateRule, undefined);
  assert.deepEqual(owner.scoreLimits[0].conditionalRule, conditional);
  assert.notEqual(owner.scoreLimits[0].conditionalRule, conditional);
  assert.equal(owner.scoreLimits[0].kind, "floor"); assert.equal(owner.scoreLimits[0].value, 0.7);
  assert.equal(owner.scoreLimits[1].value, 0.9);
  assert.deepEqual(limits.scoreLimitIssues(owner), []);
  ruleSelector().props.onChange({ target: { value: "0" } });
  assert.equal(owner.scoreLimits[0].conditionalRule, undefined);
  assert.deepEqual(owner.scoreLimits[0].childStateRule, flag);
  assert.equal(ruleSelector().props.value, 0);
});
