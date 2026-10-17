import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import { validateDocument } from "../../../../src/app/maturity-models/editor/model/editorValidation.ts";

test("blank question numbers produce issues linked to the question and parent practice", () => {
  const document = createEmptyDocument();
  const practice = document.dimensions[0].modules[0].practices[0];
  const question = practice.questions[0];
  question.text = "How often?";
  question.type = "likert";
  question.weight = NaN;
  question.scalePointCount = NaN;

  const issues = validateDocument(document).filter((issue) => issue.questionKey === question.clientKey);
  assert.equal(issues.length, 2);
  assert.ok(issues.every((issue) => issue.selection?.key === practice.clientKey && issue.severity === "error"));

  question.weight = 6;
  question.scalePointCount = 6;
  assert.equal(validateDocument(document).filter((issue) => issue.questionKey === question.clientKey).length, 0);
});

test("missing question text, option values, and bounds remain associated with their question", () => {
  const document = createEmptyDocument();
  const practice = document.dimensions[0].modules[0].practices[0];
  const question = practice.questions[0];
  question.text = "";
  question.type = "multiple_choice";
  question.choices = [{ label: "Option", score: NaN }];
  assert.equal(validateDocument(document).filter((issue) => issue.questionKey === question.clientKey).length, 2);

  question.text = "Enter a value";
  question.type = "numeric";
  question.rangeMin = NaN;
  question.rangeMax = 10;
  const issues = validateDocument(document).filter((issue) => issue.questionKey === question.clientKey);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /integer bounds/);
});

test("structure weights require positive values and identify the affected field", () => {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  const module = dimension.modules[0];
  const practice = module.practices[0];
  for (const value of [NaN, 0, -1]) {
    dimension.weight = module.weight = practice.weight = value;
    const issues = validateDocument(document);
    for (const [kind, item] of [["dimension", dimension], ["module", module], ["practice", practice]] as const) {
      assert.ok(issues.some((issue) => issue.field === `${kind}-${item.clientKey}-weight` && issue.severity === "error"));
    }
  }
  dimension.weight = module.weight = practice.weight = 0.5;
  assert.equal(validateDocument(document).filter((issue) => issue.field?.endsWith("-weight")).length, 0);
});

test("zero question weight is valid only while the question is optional", () => {
  const document = createEmptyDocument();
  const question = document.dimensions[0].modules[0].practices[0].questions[0];
  const weightIssues = () => validateDocument(document).filter((issue) => issue.field === `question-${question.clientKey}-weight`);
  question.weight = 0;
  question.required = false;
  assert.equal(weightIssues().length, 0);
  question.required = true;
  assert.equal(weightIssues().length, 1);
  question.weight = 0.5;
  assert.equal(weightIssues().length, 0);
  question.required = false;
  for (const invalid of [NaN, -1, Infinity]) {
    question.weight = invalid;
    assert.equal(weightIssues().length, 1);
  }
});

test("dependency conditions survive hydration, and parent edits require explicit repair", async () => {
  const { hydrateDocument, serializeDocument, emptyQuestion } = await import("../../../../src/app/maturity-models/editor/model/editorDocument.ts");
  const document = createEmptyDocument();
  const practice = document.dimensions[0].modules[0].practices[0];
  const parent = practice.questions[0]; parent.type = "multiple_choice";
  parent.choices = [{ id: "a", label: "A", score: 0.5 }, { id: "b", label: "B", score: 0.5 }];
  const child = emptyQuestion(2); child.dependsOnQuestionCode = parent.code;
  child.dependencyCondition = { type: "multiple_choice", optionIds: ["b"] };
  practice.questions.push(child);
  const dependencyIssues = () => validateDocument(document).filter((issue) => issue.questionKey === child.clientKey && /activation|dependency/.test(issue.message));
  assert.equal(dependencyIssues().length, 0);
  const restored = hydrateDocument(serializeDocument(document) as typeof document, false);
  assert.deepEqual(restored.dimensions[0].modules[0].practices[0].questions[1].dependencyCondition, child.dependencyCondition);
  parent.choices.reverse(); parent.choices[0].label = "Renamed"; parent.choices[0].score = 0;
  assert.equal(dependencyIssues().length, 0);
  parent.choices.shift(); assert.equal(dependencyIssues().length, 1);
  parent.type = "likert"; assert.equal(dependencyIssues().length, 1);
  child.dependencyCondition = { type: "likert", points: [5] }; assert.equal(dependencyIssues().length, 0);
  parent.scalePointCount = 4; assert.equal(dependencyIssues().length, 1);
});
