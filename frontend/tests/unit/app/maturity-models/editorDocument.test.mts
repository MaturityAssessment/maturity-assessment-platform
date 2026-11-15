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

test("unused weights retain valid values and serialize unfinished values safely", () => {
  const document = createEmptyDocument();
  const dimension = document.dimensions[0];
  const module = dimension.modules[0];
  const practice = module.practices[0];
  const question = practice.questions[0];
  document.aggregationRule = dimension.aggregationRule = module.aggregationRule = practice.aggregationRule = "AVERAGE";
  const serializedWeights = () => {
    const savedDimension = serializeDocument(document).dimensions[0];
    const savedModule = savedDimension.modules[0];
    const savedPractice = savedModule.practices[0];
    return [savedDimension.weight, savedModule.weight, savedPractice.weight, savedPractice.questions[0].weight];
  };

  dimension.weight = 2;
  module.weight = 3;
  practice.weight = 4;
  question.weight = 5;
  assert.deepEqual(serializedWeights(), [2, 3, 4, 5]);
  question.required = true;
  for (const invalid of [NaN, Infinity, -1, 0]) {
    dimension.weight = module.weight = practice.weight = question.weight = invalid;
    assert.deepEqual(serializedWeights(), [1, 1, 1, 1]);
    assert.ok(Object.is(question.weight, invalid), "saving does not mutate the draft");
  }
  question.required = false;
  assert.equal(serializedWeights()[3], 0);

  // Active weights still need validation; serialization must not hide errors.
  document.aggregationRule = dimension.aggregationRule = module.aggregationRule = practice.aggregationRule = "WEIGHTED_AVERAGE";
  dimension.weight = module.weight = practice.weight = question.weight = NaN;
  assert.ok(serializedWeights().every(Number.isNaN));
});

test("gating percentages default to zero and survive hydration and serialization", () => {
  const document = createEmptyDocument();
  assert.equal(document.dimensions[0].minimumCoverage, 0);
  const practice = document.dimensions[0].modules[0].practices[0];
  assert.equal(practice.minimumIncludedCount, 0);
  practice.minimumCoverage = 82.5;
  practice.minimumIncludedCount = 75;
  const serialized = serializeDocument(document);
  const hydrated = hydrateDocument(serialized as unknown as typeof document, false);
  assert.equal(hydrated.dimensions[0].modules[0].practices[0].minimumCoverage, 82.5);
  assert.equal(hydrated.dimensions[0].modules[0].practices[0].minimumIncludedCount, 75);
  assert.equal("gatingRules" in serialized.dimensions[0].modules[0].practices[0], false);
  const legacy = structuredClone(document) as any;
  legacy.dimensions[0].gatingRules = [{ operation: "set", value: 1 }];
  delete legacy.dimensions[0].minimumCoverage;
  delete legacy.dimensions[0].minimumIncludedCount;
  assert.equal("gatingRules" in serializeDocument(hydrateDocument(legacy, false)).dimensions[0], false);
  assert.equal(hydrateDocument(legacy, false).dimensions[0].minimumCoverage, 0);
  assert.equal(hydrateDocument(legacy, false).dimensions[0].minimumIncludedCount, 0);
});


test("multiple selection raw values survive editor serialization and hydration", () => {
  const document = createEmptyDocument();
  const question = document.dimensions[0].modules[0].practices[0].questions[0];
  question.type = "multiple_selection";
  question.choices = [
    { id: "policy", label: "Policy", score: 0, rawValue: 2.5 },
    { id: "training", label: "Training", score: 0, rawValue: 7.5 },
  ];
  const serialized = serializeDocument(document);
  const restored = hydrateDocument(serialized as unknown as typeof document, false);
  assert.deepEqual(restored.dimensions[0].modules[0].practices[0].questions[0].choices, question.choices);
});

test("practice evidence requirements round-trip without question flags", () => {
  const document = createEmptyDocument();
  const practice = document.dimensions[0].modules[0].practices[0];
  assert.equal(practice.requiresEvidence, false);
  practice.evidenceRequirements = [{ code: "report", name: "Monthly report", instructions: "Use reporting-period end", required: true, format: "FILE_OR_URL" }];
  const serialized = serializeDocument(document);
  const restored = hydrateDocument(serialized as Parameters<typeof hydrateDocument>[0], false);
  assert.equal(restored.dimensions[0].modules[0].practices[0].requiresEvidence, true);
  assert.equal("requiresEvidence" in serialized.dimensions[0].modules[0].practices[0].questions[0], false);
});

test("legacy evidence flags become a named requirement and can be removed explicitly", () => {
  const document = createEmptyDocument();
  const practice = document.dimensions[0].modules[0].practices[0];
  practice.requiresEvidence = true;
  delete practice.evidenceRequirements;
  const restored = hydrateDocument(document, false);
  const hydratedPractice = restored.dimensions[0].modules[0].practices[0];
  assert.equal(hydratedPractice.evidenceRequirements?.[0].code, "supporting-evidence");
  hydratedPractice.evidenceRequirements = [];
  assert.equal(serializeDocument(restored).dimensions[0].modules[0].practices[0].requiresEvidence, false);
});
