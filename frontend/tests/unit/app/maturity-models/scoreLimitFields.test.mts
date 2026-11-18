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
const text = (node: any): string => node == null || typeof node === "boolean" ? "" : typeof node !== "object" ? String(node) : Array.isArray(node) ? node.map(text).join("") : text(node.props?.children);
const nodes = (node: any): any[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
const flag = { name: "Check", quantifier: "any", state: "computed", effect: "flagForReview" };

test("creator can add, edit, repair and remove a limit without silently updating its approved rule", () => {
  let owner: any = { childStateGatingRules: [structuredClone(flag)], scoreLimits: [] };
  const render = () => nodes(exports.default({ owner, onChange: (scoreLimits: any) => { owner = { ...owner, scoreLimits }; } }));
  const named = (name: string) => render().find(node => node.props?.["aria-label"] === name)!;
  render().find(node => node.type === "button" && text(node).endsWith("Add score limit"))!.props.onClick();
  assert.equal(owner.scoreLimits.length, 1);
  named("Score limit 1 floor").props.onClick();
  named("Score limit 1 floor value").props.onChange({ target: { value: "0.655" } });
  assert.equal(owner.scoreLimits[0].kind, "floor"); assert.equal(owner.scoreLimits[0].value, 0.655);
  owner.childStateGatingRules[0].name = "Changed";
  assert.equal(owner.scoreLimits[0].childStateRule.name, "Check");
  assert.equal(named("Score limit 1 rule").props.value, "");
  assert.ok(render().some(node => node.props?.role === "alert" && /changed or was removed/.test(node.props.children)));
  named("Score limit 1 rule").props.onChange({ target: { value: "0" } });
  assert.deepEqual(limits.scoreLimitIssues(owner), []);
  assert.equal(owner.scoreLimits[0].childStateRule.name, "Changed");
  named("Score limit 1 floor value").props.onChange({ target: { value: "" } });
  assert.ok(limits.scoreLimitIssues(owner).length);
  named("Remove score limit 1").props.onClick();
  assert.deepEqual(owner.scoreLimits, []);
});

test("withhold rules cannot be selected as limit triggers", () => {
  const rendered = nodes(exports.default({ owner: { childStateGatingRules: [{ ...flag, effect: "withheld" }] }, onChange() {} }));
  assert.equal(rendered.find(node => node.type === "button" && text(node).endsWith("Add score limit"))!.props.disabled, true);
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
  assert.equal(nodes(ruleSelector()).find(node => node.type === "option" && node.props.value === 0).props.disabled, true);
  ruleSelector().props.onChange({ target: { value: "0" } });
  assert.deepEqual(owner.scoreLimits[0].conditionalRule, conditional);
  assert.equal(ruleSelector().props.value, 1);
  render().find(node => node.props?.["aria-label"] === "Remove score limit 2")!.props.onClick();
  ruleSelector().props.onChange({ target: { value: "0" } });
  assert.equal(owner.scoreLimits[0].conditionalRule, undefined);
  assert.deepEqual(owner.scoreLimits[0].childStateRule, flag);
  assert.equal(ruleSelector().props.value, 0);
});

test("adding selects unused gates and removal makes a gate available again", () => {
  const conditional = { version: 1, effect: "flagForReview", name: "Conditional", when: { kind: "and", conditions: [] } };
  let owner: any = { childStateGatingRules: [structuredClone(flag), structuredClone(flag)], conditionalGatingRules: [conditional], scoreLimits: [] };
  const render = () => nodes(exports.default({ owner, onChange: (scoreLimits: any) => { owner = { ...owner, scoreLimits }; } }));
  const add = () => render().find(node => node.type === "button" && text(node).endsWith("Add score limit"))!;
  add().props.onClick();
  add().props.onClick();
  assert.equal(owner.scoreLimits.length, 2);
  assert.deepEqual(owner.scoreLimits[0].childStateRule, flag);
  assert.deepEqual(owner.scoreLimits[1].conditionalRule, conditional);
  assert.equal(add().props.disabled, true);
  add().props.onClick();
  assert.equal(owner.scoreLimits.length, 2);
  render().find(node => node.props?.["aria-label"] === "Remove score limit 1")!.props.onClick();
  assert.equal(add().props.disabled, false);
  add().props.onClick();
  assert.deepEqual(owner.scoreLimits[1].childStateRule, flag);
});

test("range controls and exact values stay in sync and show the allowed interval", () => {
  let owner: any = { childStateGatingRules: [flag], scoreLimits: [{ kind: "ceiling", value: 0.655, childStateRule: flag }] };
  const render = () => nodes(exports.default({ owner, onChange: (scoreLimits: any) => { owner = { ...owner, scoreLimits }; } }));
  const named = (name: string) => render().find(node => node.props?.["aria-label"] === name)!;
  assert.equal(named("Score limit 1 ceiling range").props.value, 0.655);
  assert.match(named("Score limit 1 ceiling range").props["aria-valuetext"], /0.655 ceiling/);
  named("Score limit 1 ceiling range").props.onChange({ target: { value: "0.725" } });
  assert.equal(named("Score limit 1 ceiling value").props.value, 0.725);
  named("Score limit 1 floor").props.onClick();
  assert.match(named("Score limit 1 floor range").props["aria-valuetext"], /0.725 floor/);
  for (const value of [0, 1, 0.123456]) {
    named("Score limit 1 floor value").props.onChange({ target: { value: String(value) } });
    assert.equal(named("Score limit 1 floor range").props.value, value);
    assert.deepEqual(limits.scoreLimitIssues(owner), []);
  }
  named("Score limit 1 floor value").props.onChange({ target: { value: "1.1" } });
  assert.equal(named("Score limit 1 floor value").props["aria-invalid"], true);
  assert.ok(render().some(node => node.props?.role === "alert"));
});

test("legacy duplicates remain visible with an actionable validation error", () => {
  const owner: any = { childStateGatingRules: [flag], scoreLimits: [{ kind: "floor", value: 0.2, childStateRule: flag }, { kind: "ceiling", value: 0.8, childStateRule: flag }] };
  const rendered = nodes(exports.default({ owner, onChange() {} }));
  assert.equal(rendered.filter(node => node.props?.role === "group" && /^Score limit \d+$/.test(node.props?.["aria-label"] ?? "")).length, 2);
  assert.ok(rendered.some(node => node.props?.role === "alert" && /already has a limit/.test(text(node))));
});

test("Both edits two normalized value bounds in one gate row and preserves the selected bound when switching modes", () => {
  let owner: any = { childStateGatingRules: [flag], scoreLimits: [{ kind: "ceiling", value: 0.7, childStateRule: flag }] };
  const render = () => nodes(exports.default({ owner, onChange: (scoreLimits: any) => { owner = { ...owner, scoreLimits }; } }));
  const named = (name: string) => render().find(node => node.props?.["aria-label"] === name)!;
  named("Score limit 1 both").props.onClick();
  assert.equal(owner.scoreLimits.length, 1);
  assert.equal(owner.scoreLimits[0].kind, "both");
  assert.equal(named("Score limit 1 floor value").props.value, 0);
  assert.equal(named("Score limit 1 ceiling value").props.value, 0.7);
  named("Score limit 1 floor value").props.onChange({ target: { value: "0.3" } });
  assert.equal(owner.scoreLimits[0].value, 0.3);
  assert.equal(owner.scoreLimits[0].upperValue, 0.7);
  assert.deepEqual(limits.scoreLimitIssues(owner), []);
  assert.ok(render().some(node => node.type === "p" && /raised to 0.3.*capped at 0.7/.test(text(node))));
  named("Score limit 1 ceiling range").props.onChange({ target: { value: "0.1" } });
  assert.equal(owner.scoreLimits[0].upperValue, 0.3);
  named("Score limit 1 ceiling value").props.onChange({ target: { value: "0.7" } });
  named("Score limit 1 floor range").props.onChange({ target: { value: "0.9" } });
  assert.equal(owner.scoreLimits[0].value, 0.7);
  named("Score limit 1 floor value").props.onChange({ target: { value: "0.3" } });
  named("Score limit 1 ceiling").props.onClick();
  assert.equal(owner.scoreLimits[0].value, 0.7);
  assert.equal(owner.scoreLimits[0].upperValue, undefined);
  named("Score limit 1 both").props.onClick();
  named("Score limit 1 floor value").props.onChange({ target: { value: "0.3" } });
  named("Score limit 1 floor").props.onClick();
  assert.equal(owner.scoreLimits[0].value, 0.3);
  assert.equal(owner.scoreLimits[0].upperValue, undefined);
  named("Score limit 1 both").props.onClick();
  assert.equal(owner.scoreLimits[0].value, 0.3);
  assert.equal(owner.scoreLimits[0].upperValue, 1);
});

test("crossed and empty normalized value bounds block saving and track clicks move the nearest handle", () => {
  let owner: any = { childStateGatingRules: [flag], scoreLimits: [{ kind: "both", value: 0.3, upperValue: 0.7, childStateRule: flag }] };
  const render = () => nodes(exports.default({ owner, onChange: (scoreLimits: any) => { owner = { ...owner, scoreLimits }; } }));
  const named = (name: string) => render().find(node => node.props?.["aria-label"] === name)!;
  const input = (bound: string, value: string) => named(`Score limit 1 ${bound} value`).props.onChange({ target: { value } });
  input("ceiling", "0.2");
  assert.ok(render().some(node => node.props?.role === "alert" && /ceiling/.test(text(node))));
  input("ceiling", "");
  assert.equal(named("Score limit 1 ceiling value").props.value, "");
  assert.ok(limits.scoreLimitIssues(owner).length);
  input("ceiling", "0.7");
  const track = named("Score limit 1 allowed range");
  const target = { getBoundingClientRect: () => ({ left: 0, width: 114 }) };
  track.props.onPointerDown({ target, currentTarget: target, clientX: 47 });
  assert.equal(owner.scoreLimits[0].value, 0.4);
  track.props.onPointerDown({ target, currentTarget: target, clientX: 87 });
  assert.equal(owner.scoreLimits[0].upperValue, 0.8);
  assert.equal(named("Score limit 1 floor range").props.step, 0.005);
  assert.equal(named("Score limit 1 floor value").props.step, 0.005);
  named("Score limit 1 floor range").props.onChange({ target: { value: "0.412" } });
  assert.equal(owner.scoreLimits[0].value, 0.41);
  assert.deepEqual(limits.scoreLimitIssues(owner), []);
});
