import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// The existing Node test runner strips TS but cannot load TSX. Compile in
// memory so these checks exercise the real adapter and rendered controls.
const require = createRequire(import.meta.url);
const sourceRoot = fileURLToPath(new URL("../../../../src/", import.meta.url));
const cache = new Map<string, any>();
function load(path: string): any {
  const filename = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]
    .find((candidate) => existsSync(candidate) && /\.(ts|tsx)$/.test(candidate));
  assert.ok(filename, `Missing component: ${path}`);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const localRequire = (id: string) => id.startsWith("@/")
    ? load(resolve(sourceRoot, id.slice(2)))
    : id.startsWith(".") ? load(resolve(dirname(filename), id)) : require(id);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  new Function("require", "exports", outputText)(localRequire, exports);
  return exports;
}

const Card = load(resolve(sourceRoot, "app/assessment/AssessmentQuestionCard.tsx")).default;
const inputs = load(resolve(sourceRoot, "components/assessment/question-card/index.ts"));
const question = { id: 1, text: "Policy approved?", help: "", weight: 1, type: "boolean" };
function card(overrides: Record<string, any> = {}) {
  return Card({ question, fieldName: "D_M_10_1", value: undefined, disabled: false,
    respondentUpdated: false, onInputChange: () => {}, onClearAnswer: () => {}, ...overrides });
}

test("the adapter selects each input and preserves field callbacks, zero, and explicit none", () => {
  const expected = { boolean: "BooleanQuestionInput", likert: "ScaleQuestionInput",
    multiple_choice: "SingleChoiceQuestionInput", multiple_selection: "MultiSelectQuestionInput",
    numeric: "NumericQuestionInput", percentage: "PercentageQuestionInput", open_answer: "OpenAnswerQuestionInput" };
  for (const [type, name] of Object.entries(expected)) {
    const calls: unknown[] = [];
    const value = type === "multiple_selection" ? [] : type === "open_answer" ? "Policy" : 0;
    const element = card({ question: { ...question, type, rangeMin: 0, rangeMax: 100 }, value,
      onInputChange: (...args: unknown[]) => calls.push(args) });
    const input = element.props.children;
    assert.equal(input.type, inputs[name]);
    assert.deepEqual(input.props.value, value);
    input.props.onChange(value);
    assert.deepEqual(calls, [["D_M_10_1", value]]);
  }
});

test("review and dependency locks are explicit and clear actions respect them", () => {
  for (const status of ["ACCEPTED", "ADJUSTED", "FLAGGED"]) {
    const element = card({ value: 0, evaluation: { validationStatus: status } });
    const locked = status !== "FLAGGED";
    assert.equal(element.props.interactionDisabled, locked);
    assert.equal(element.props.children.props.disabled, locked);
    assert.equal(typeof element.props.onClear, locked ? "undefined" : "function");
  }
  assert.equal(card({ disabled: true, value: 1 }).props.interactionDisabled, true);
  assert.equal(card({ question: { ...question, id: undefined } }), null);
  const cleared: unknown[] = [];
  card({ value: 0, onClearAnswer: (field: string) => cleared.push(field) }).props.onClear();
  assert.deepEqual(cleared, ["D_M_10_1"]);
});

test("choice values retain scores for single choice and indexes for multiple selection", () => {
  const choices = [{ label: "Policy", score: 0.75 }, { label: "Training", score: 0.25 }];
  const single = card({ question: { ...question, type: "multiple_choice", choices } });
  const multiple = card({ question: { ...question, type: "multiple_selection", choices }, value: [] });
  assert.deepEqual(single.props.children.props.options, [
    { label: "Policy", value: 0.75 }, { label: "Training", value: 0.25 },
  ]);
  assert.deepEqual(multiple.props.children.props.options, [
    { label: "Policy", value: 0 }, { label: "Training", value: 1 },
  ]);
  assert.match(renderToStaticMarkup(multiple), /checked=""[^>]*\/>[^<]*<span>None of the above/);
});

test("rendering preserves tour targets, zero selection, and bounded percentage validation", () => {
  const html = renderToStaticMarkup(createElement(Card, {
    question: { ...question, required: true, help: "Guidance" }, fieldName: "answer", value: 0,
    disabled: false, respondentUpdated: false, onInputChange: () => {}, onClearAnswer: () => {},
    onAskAssistant: () => {}, helpTourTargets: { question: true, requirements: true, actions: true, guidance: true },
  }));
  for (const target of ["card", "requirements", "actions", "guidance"]) {
    assert.ok(html.includes(`data-help-tour="assessment-question-${target}"`));
  }
  assert.match(html, /<input[^>]*checked=""[^>]*value="0"/);
  assert.ok(html.includes("Clear answer"));
  assert.ok(html.includes("Ask the assistant about this item"));
  const percentage = renderToStaticMarkup(card({
    question: { ...question, type: "percentage", rangeMin: 0, rangeMax: 100 }, value: 101,
  }));
  assert.match(percentage, /aria-invalid="true"/);
  assert.ok(percentage.includes("Enter a whole number between 0 and 100%"));
  assert.match(percentage, /type="range"/);
});

test("evaluation read-only answers stay visible without a misleading dependency warning", () => {
  for (const type of ["boolean", "likert", "multiple_choice", "multiple_selection", "numeric", "percentage", "open_answer"]) {
    const element = card({ question: { ...question, type }, value: type === "open_answer" ? "Submitted answer" : 1, readOnly: true });
    assert.equal(element.props.interactionDisabled, true);
    assert.equal(element.props.children.props.disabled, true);
    assert.equal(element.props.onClear, undefined);
    assert.equal(element.props.disabledMessage, undefined);
  }
});
