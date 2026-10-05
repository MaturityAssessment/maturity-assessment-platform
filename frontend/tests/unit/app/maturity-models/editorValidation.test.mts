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
