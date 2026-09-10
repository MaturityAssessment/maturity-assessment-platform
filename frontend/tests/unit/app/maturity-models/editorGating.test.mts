import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyDocument } from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import {
  deleteQuestion,
  updateQuestion,
} from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";
import { hasGatingRuleIssues } from "../../../../src/app/maturity-models/editor/model/gatingRules.ts";

test("question code changes and deletion maintain specific-child gating references", () => {
  let document = createEmptyDocument();
  const practice = document.dimensions[0].modules[0].practices[0];
  const question = practice.questions[0];
  practice.gatingRules = [{
    order: 0,
    selection: "specificChild",
    childCode: question.code,
    operator: "<",
    threshold: 0.4,
    operation: "set",
    value: 0.4,
  }];

  document = updateQuestion(document, practice.clientKey, question.clientKey, {
    ...question,
    code: "Q_RENAMED",
  });
  assert.equal(
    document.dimensions[0].modules[0].practices[0].gatingRules[0].childCode,
    "Q_RENAMED"
  );

  document = deleteQuestion(document, practice.clientKey, question.clientKey);
  assert.deepEqual(
    document.dimensions[0].modules[0].practices[0].gatingRules,
    []
  );
});

test("gating validation rejects out-of-scope and over-precision values", () => {
  assert.equal(
    hasGatingRuleIssues(
      [{
        order: 0,
        selection: "specificChild",
        childCode: "Q_OUTSIDE",
        operator: "==",
        threshold: 0.345,
        operation: "add",
        value: 0.1,
      }],
      ["Q1"]
    ),
    true
  );
});
