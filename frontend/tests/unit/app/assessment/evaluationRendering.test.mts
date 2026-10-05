import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourceRoot = fileURLToPath(new URL("../../../../src/", import.meta.url));
const cache = new Map<string, any>();
function load(path: string): any {
  const filename = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`].find(p => existsSync(p) && /\.(ts|tsx)$/.test(p));
  assert.ok(filename, path);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {}; cache.set(filename, exports);
  const localRequire = (id: string): any => id === "@/components" ? { AgentChatModal: () => null } : id === "next/navigation" ? { redirect: (url: string) => { throw new Error(`redirect:${url}`); } } : id.startsWith("@/") ? load(resolve(sourceRoot, id.slice(2))) : id.startsWith(".") ? load(resolve(dirname(filename), id)) : require(id);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  new Function("require", "exports", outputText)(localRequire, exports);
  return exports;
}
const Controls = load(resolve(sourceRoot, "app/assessment/evaluation/QuestionEvaluationControls.tsx")).default;
const Panel = load(resolve(sourceRoot, "app/assessment/evaluation/EvaluationPanel.tsx")).default;
const Step = load(resolve(sourceRoot, "app/assessment/AssessmentStep.tsx")).default;
const noOp = () => {};
const model = { id: 7, name: "Model", levels: [], dimensions: [{ id: "D", name: "Dimension", modules: [] }] };
const assessment = { id: 41, status: "PENDING_REVIEW", createdAt: "2026-01-01", overallAverage: 2, overallMaturityLevel: "2" };
const question = { responseKey: "D_M_1_1", dimensionId: "D", moduleName: "Module", practiceName: "Practice", questionId: 1, question: { id: 1, text: "Policy?", type: "boolean" }, initialScore: 1, requiresManualScore: false };
const evaluation = { editable: true, busy: false, status: "saved", evidence: [], error: null, notice: null, finalRemarks: "", progress: { total: 1, reviewed: 0, flagged: 0, missingManualScores: 0, missingNotes: 0 }, outstanding: [question], questions: [question], reviews: { D_M_1_1: { reviewerNote: "" } }, agentLoading: false, agentReport: null, canFinish: false, canSendBack: false, flush: noOp, remove: noOp, runAgent: noOp, importReport: noOp, setError: noOp, updateRemarks: noOp, transition: noOp, download: noOp, updateReview: noOp };

test("inline controls retain scoring rules across every question type", () => {
  const cases = [
    { type: "boolean", expected: /value="0">Incorrect/, extra: {} },
    { type: "likert", expected: /value="1">Point 1/, extra: { scalePointCount: 3, scaleHighPointIsMaximum: false } },
    { type: "multiple_choice", expected: /value="0.25">Training/, extra: { choices: [{ label: "Training", score: 0.25 }] } },
    { type: "multiple_selection", expected: /max="1"/, extra: {} },
    { type: "numeric", expected: /min="0"/, extra: {} },
    { type: "percentage", expected: /max="1"/, extra: {} },
    { type: "open_answer", expected: /value="3">Level 3/, extra: {} },
  ];
  for (const { type, expected, extra } of cases) {
    const html = renderToStaticMarkup(createElement(Controls, { question: { ...question, question: { ...question.question, type, ...extra }, requiresManualScore: type === "open_answer" }, review: { validationStatus: "ADJUSTED", reviewerNote: "Reason" }, scoreOptions: [{ value: 3, label: "Level 3" }], onChange: noOp }));
    assert.match(html, expected, type);
    assert.match(html, /Reviewer note/);
    assert.doesNotMatch(html, /Submitted answer/);
  }
});
test("evaluation practice renders submitted answer once and practice evidence without upload controls", () => {
  const step = { key: "practice-1", dimension: model.dimensions[0], module: { code: "M", name: "Module" }, practice: { id: 1, name: "Practice", questions: [question.question] } };
  const html = renderToStaticMarkup(createElement(Step, { readOnly: true, evaluationController: evaluation, modelName: "Model", modelMaxLevel: 5, dimensionName: "Dimension", navigationModules: [], activeModuleKey: "M", practiceSteps: [step], activePracticeKey: step.key, formData: { D_M_1_1: 1 }, evidenceFiles: new Map(), respondentUpdatedResponseKeys: new Set(), outstandingFlaggedCount: 0, assistantEnabled: false, questionTourTargetIndexes: {}, nextModuleName: null, onModuleSelect: noOp, onModuleOverview: noOp, onNextModule: null, onPracticeSelect: noOp, onInputChange: noOp, onClearAnswer: noOp, onEvidenceItemsChange: noOp, onOverview: noOp }));
  assert.equal((html.match(/Policy\?/g) || []).length, 1);
  assert.match(html, /No evidence attached/);
  assert.match(html, /Accept/);
  assert.doesNotMatch(html, /type="file"/);
  const readonly = renderToStaticMarkup(createElement(Controls, { question, review: { validationStatus: "ACCEPTED", reviewerNote: "Approved" }, scoreOptions: [], onChange: noOp }));
  assert.match(readonly, /Approved/);
});
test("Evaluation panel exposes review actions only while editable, keeping remarks readable", () => {
  const active = renderToStaticMarkup(createElement(Panel, { assessment, model, evaluation, onQuestion: noOp }));
  assert.match(active, /Next question needing review/);
  assert.match(active, /Run local agent beta/);
  assert.match(active, /Finish evaluation/);
  const completed = renderToStaticMarkup(createElement(Panel, { assessment: { ...assessment, status: "COMPLETED" }, model, evaluation: { ...evaluation, editable: false, finalRemarks: "Final assessment remarks" }, onQuestion: noOp }));
  assert.match(completed, /readonly=""/);
  assert.match(completed, /Final assessment remarks/);
  assert.doesNotMatch(completed, /Run local agent beta|Finish evaluation|Request changes/);
});
test("legacy evaluator page redirects into the shared Evaluation tab", () => {
  const Page = load(resolve(sourceRoot, "app/evaluate/[id]/page.tsx")).default;
  assert.throws(() => Page({ params: { id: "41" } }), /redirect:\/assessment\?draftId=41&tab=evaluation/);
});
