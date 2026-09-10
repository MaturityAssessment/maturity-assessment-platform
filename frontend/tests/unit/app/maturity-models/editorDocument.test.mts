import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyDocument,
  hydrateDocument,
  serializeDocument,
} from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";

test("new and legacy editor documents default every aggregating item to weighted average", () => {
  const fresh = createEmptyDocument();
  assert.equal(fresh.aggregationRule, "WEIGHTED_AVERAGE");
  assert.equal(fresh.dimensions[0].aggregationRule, "WEIGHTED_AVERAGE");
  assert.deepEqual(
    fresh.dimensions[0].mappingRules.map((rule) => rule.minimumScore),
    [0, 0.2, 0.4, 0.6, 0.8]
  );
  assert.equal(fresh.dimensions[0].modules[0].aggregationRule, "WEIGHTED_AVERAGE");
  assert.equal(
    fresh.dimensions[0].modules[0].practices[0].aggregationRule,
    "WEIGHTED_AVERAGE"
  );
  assert.equal(
    fresh.dimensions[0].modules[0].practices[0].questions[0]
      .booleanCorrectAnswer,
    true
  );
  assert.equal(
    fresh.dimensions[0].modules[0].practices[0].questions[0].scalePointCount,
    5
  );

  const legacy = hydrateDocument(
    {
      ...fresh,
      aggregationRule: undefined,
      dimensions: fresh.dimensions.map(
        ({ weight: _weight, aggregationRule: _rule, ...dimension }) => ({
          ...dimension,
          modules: dimension.modules.map(
            ({ aggregationRule: _moduleRule, ...module }) => ({
              ...module,
              practices: module.practices.map(
                ({ aggregationRule: _practiceRule, ...practice }) => practice
              ),
            })
          ),
        })
      ),
    } as unknown as typeof fresh,
    false
  );

  assert.equal(legacy.aggregationRule, "WEIGHTED_AVERAGE");
  assert.equal(legacy.dimensions[0].weight, 1);
  assert.equal(legacy.dimensions[0].aggregationRule, "WEIGHTED_AVERAGE");
  assert.equal(
    legacy.dimensions[0].modules[0].practices[0].aggregationRule,
    "WEIGHTED_AVERAGE"
  );
  assert.equal(
    legacy.dimensions[0].modules[0].practices[0].questions[0]
      .booleanCorrectAnswer,
    true
  );
});

test("serialization retains selected aggregation rules and dimension weights", () => {
  const document = createEmptyDocument();
  document.aggregationRule = "SUM";
  document.dimensions[0].aggregationRule = "MEDIAN";
  document.dimensions[0].modules[0].aggregationRule = "MAXIMUM";
  document.dimensions[0].modules[0].practices[0].aggregationRule = "MINIMUM";
  document.dimensions[0].weight = 2.5;
  document.dimensions[0].mappingRules[2].minimumScore = 0.55;
  document.dimensions[0].modules[0].practices[0].questions[0].booleanCorrectAnswer =
    false;
  const question =
    document.dimensions[0].modules[0].practices[0].questions[0];
  question.type = "likert";
  question.scalePointCount = 7;
  question.scaleMinLabel = "Never";
  question.scaleMaxLabel = "Always";
  question.scaleHighPointIsMaximum = false;

  const serialized = serializeDocument(document);

  assert.equal(serialized.aggregationRule, "SUM");
  assert.equal(serialized.dimensions[0].aggregationRule, "MEDIAN");
  assert.equal(serialized.dimensions[0].modules[0].aggregationRule, "MAXIMUM");
  assert.equal(
    serialized.dimensions[0].modules[0].practices[0].aggregationRule,
    "MINIMUM"
  );
  assert.equal(serialized.dimensions[0].weight, 2.5);
  assert.equal(serialized.dimensions[0].mappingRules[2].minimumScore, 0.55);
  assert.equal(
    serialized.dimensions[0].modules[0].practices[0].questions[0]
      .booleanCorrectAnswer,
    false
  );
  const serializedQuestion =
    serialized.dimensions[0].modules[0].practices[0].questions[0];
  assert.equal(serializedQuestion.scalePointCount, 7);
  assert.equal(serializedQuestion.scaleMinLabel, "Never");
  assert.equal(serializedQuestion.scaleMaxLabel, "Always");
  assert.equal(serializedQuestion.scaleHighPointIsMaximum, false);
});

test("gating rules default empty and serialize in contiguous display order", () => {
  const document = createEmptyDocument();
  const practice = document.dimensions[0].modules[0].practices[0];
  assert.deepEqual(document.dimensions[0].gatingRules, []);
  assert.deepEqual(document.dimensions[0].modules[0].gatingRules, []);
  assert.deepEqual(practice.gatingRules, []);

  practice.gatingRules = [
    {
      order: 8,
      selection: "anyChild",
      operator: "<",
      threshold: 0.4,
      operation: "set",
      value: 0.4,
    },
    {
      order: 3,
      selection: "specificChild",
      childCode: practice.questions[0].code,
      operator: ">=",
      threshold: 0.8,
      operation: "add",
      value: 0.1,
    },
  ];

  const serialized = serializeDocument(document);
  assert.deepEqual(
    serialized.dimensions[0].modules[0].practices[0].gatingRules.map(
      (rule) => rule.order
    ),
    [0, 1]
  );
  assert.equal(
    serialized.dimensions[0].modules[0].practices[0].gatingRules[0].childCode,
    undefined
  );

  const legacy = hydrateDocument(
    {
      ...document,
      dimensions: document.dimensions.map(({ gatingRules: _rules, ...dimension }) => ({
        ...dimension,
        modules: dimension.modules.map(({ gatingRules: _moduleRules, ...module }) => ({
          ...module,
          practices: module.practices.map(({ gatingRules: _practiceRules, ...practice }) => practice),
        })),
      })),
    } as unknown as typeof document,
    false
  );
  assert.deepEqual(legacy.dimensions[0].gatingRules, []);
  assert.deepEqual(legacy.dimensions[0].modules[0].practices[0].gatingRules, []);
});
