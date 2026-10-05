import test from "node:test";
import assert from "node:assert/strict";
import {
  codePrefix,
  codeSuffix,
  codeWithPrefix,
  renumberSiblingCodes,
} from "../../../../src/app/maturity-models/editor/model/editorCodes.ts";
import {
  createEmptyDocument,
  emptyDimension,
  emptyModule,
  emptyPractice,
  emptyQuestion,
  hydrateDocument,
  serializeDocument,
  suggestCode,
} from "../../../../src/app/maturity-models/editor/model/editorDocument.ts";
import {
  addModule,
  deleteModule,
  deletePractice,
  deleteQuestion,
  moveDimension,
  moveModule,
  movePractice,
  moveQuestion,
  reorderDimension,
  reorderModule,
  reorderPractice,
  reorderQuestion,
} from "../../../../src/app/maturity-models/editor/model/editorMutations.ts";

function fixture() {
  const document = createEmptyDocument();
  document.dimensions.push(emptyDimension(2, 1, 1, 1));
  const dimension = document.dimensions[0];
  dimension.modules.push(emptyModule(2, 1, 1));
  const module = dimension.modules[0];
  module.practices.push(emptyPractice(2, 1));
  const practice = module.practices[0];
  practice.questions.push(emptyQuestion(2));
  const rule = (childCode: string) => ({
    order: 0,
    selection: "specificChild" as const,
    childCode,
    operator: "<" as const,
    threshold: 0.5,
    operation: "set" as const,
    value: 0.5,
  });
  dimension.gatingRules = [rule(module.code)];
  module.gatingRules = [rule(practice.code)];
  practice.gatingRules = [rule(practice.questions[0].code)];
  practice.questions[1].dependsOnQuestionCode = practice.questions[0].code;
  return { document, dimension, module, practice };
}

test("generated prefixes identify type and position with at least two digits", () => {
  assert.equal(suggestCode("M", 2, "Security strategy"), "M02_SS");
  assert.equal(codePrefix("Q", 100), "Q100_");
  assert.equal(codeSuffix("m2_Custom_SUFFIX"), "Custom_SUFFIX");
  assert.equal(codeSuffix("CUSTOM_CODE"), "CUSTOM_CODE");
});

for (const operation of ["move", "reorder"] as const) {
  test(`${operation} renumbers dimensions and retains their descendants`, () => {
    const { document, dimension } = fixture();
    const second = document.dimensions[1];
    const next = operation === "move"
      ? moveDimension(document, dimension.clientKey, 1)
      : reorderDimension(document, dimension.clientKey, second.clientKey);
    assert.deepEqual(next.dimensions.map((item) => item.clientKey), [second.clientKey, dimension.clientKey]);
    assert.deepEqual(next.dimensions.map((item) => item.code), ["D01_D", "D02_D"]);
    assert.equal(next.dimensions[1].modules, dimension.modules);
    assert.equal(document.dimensions[0], dimension);
    assert.equal(dimension.code, "D01_D");
  });

  test(`${operation} renumbers modules without cascading swapped codes or dropping gates`, () => {
    const { document, dimension, module } = fixture();
    const second = dimension.modules[1];
    const next = operation === "move"
      ? moveModule(document, dimension.clientKey, module.clientKey, 1)
      : reorderModule(document, dimension.clientKey, module.clientKey, second.clientKey);
    assert.deepEqual(next.dimensions[0].modules.map((item) => item.clientKey), [second.clientKey, module.clientKey]);
    assert.deepEqual(next.dimensions[0].modules.map((item) => item.code), ["M01_M", "M02_M"]);
    assert.equal(next.dimensions[0].gatingRules[0].childCode, "M02_M");
    assert.equal(next.dimensions[1], document.dimensions[1]);
    assert.equal(dimension.gatingRules[0].childCode, "M01_M");
  });

  test(`${operation} renumbers practices and updates module gates`, () => {
    const { document, module, practice } = fixture();
    const second = module.practices[1];
    const next = operation === "move"
      ? movePractice(document, module.clientKey, practice.clientKey, 1)
      : reorderPractice(document, module.clientKey, practice.clientKey, second.clientKey);
    const result = next.dimensions[0].modules[0];
    assert.deepEqual(result.practices.map((item) => item.clientKey), [second.clientKey, practice.clientKey]);
    assert.deepEqual(result.practices.map((item) => item.code), ["P01_P", "P02_P"]);
    assert.equal(result.gatingRules[0].childCode, "P02_P");
    assert.equal(result.practices[1].questions, practice.questions);
  });

  test(`${operation} renumbers questions and preserves gating and dependency targets`, () => {
    const { document, practice } = fixture();
    const [first, second] = practice.questions;
    second.dependsOnQuestionCode = first.code.toLowerCase();
    const next = operation === "move"
      ? moveQuestion(document, practice.clientKey, first.clientKey, 1)
      : reorderQuestion(document, practice.clientKey, first.clientKey, second.clientKey);
    const result = next.dimensions[0].modules[0].practices[0];
    assert.deepEqual(result.questions.map((item) => item.clientKey), [second.clientKey, first.clientKey]);
    assert.deepEqual(result.questions.map((item) => item.code), ["Q01_Q", "Q02_Q"]);
    assert.equal(result.questions[0].dependsOnQuestionCode, "Q02_Q");
    assert.equal(result.gatingRules[0].childCode, "Q02_Q");
    assert.equal(practice.questions[0], first);
  });
}

test("loading initializes prefixes and references without changing the source document", () => {
  const { document, dimension, module, practice } = fixture();
  module.code = "m9_Custom_SUFFIX";
  dimension.gatingRules[0].childCode = "M9_CUSTOM_SUFFIX";
  practice.code = "CUSTOM_CODE";
  module.gatingRules[0].childCode = practice.code;
  practice.questions[0].code = "OLD_QUESTION";
  practice.questions[1].dependsOnQuestionCode = "OLD_QUESTION";
  practice.gatingRules[0].childCode = "OLD_QUESTION";
  const hydrated = hydrateDocument(document, false);
  const result = hydrated.dimensions[0].modules[0].practices[0];
  assert.equal(hydrated.dimensions[0].gatingRules[0].childCode, "M01_Custom_SUFFIX");
  assert.equal(hydrated.dimensions[0].modules[0].gatingRules[0].childCode, "P01_CUSTOM_CODE");
  assert.equal(result.questions[1].dependsOnQuestionCode, "Q01_OLD_QUESTION");
  assert.equal(result.gatingRules[0].childCode, "Q01_OLD_QUESTION");
  assert.equal(serializeDocument(hydrated).dimensions[0].modules[0].code, "M01_Custom_SUFFIX");
  assert.equal(module.code, "m9_Custom_SUFFIX");
  assert.equal(practice.questions[0].code, "OLD_QUESTION");
});

test("deletion closes numbering gaps, removes deleted references, and addition uses the next position", () => {
  const { document, dimension, module, practice } = fixture();
  const noModule = deleteModule(document, dimension.clientKey, module.clientKey);
  assert.equal(noModule.dimensions[0].modules[0].code, "M01_M");
  assert.deepEqual(noModule.dimensions[0].gatingRules, []);
  const added = addModule(noModule, dimension.clientKey);
  assert.deepEqual(added.dimensions[0].modules.map((item) => item.code), ["M01_M", "M02_M"]);
  const noPractice = deletePractice(document, module.clientKey, practice.clientKey);
  assert.equal(noPractice.dimensions[0].modules[0].practices[0].code, "P01_P");
  assert.deepEqual(noPractice.dimensions[0].modules[0].gatingRules, []);
  const noQuestion = deleteQuestion(document, practice.clientKey, practice.questions[0].clientKey);
  const remainingPractice = noQuestion.dimensions[0].modules[0].practices[0];
  assert.equal(remainingPractice.questions[0].code, "Q01_Q");
  assert.equal(remainingPractice.questions[0].dependsOnQuestionCode, undefined);
  assert.deepEqual(remainingPractice.gatingRules, []);
});

test("reordering changes only the affected sibling codes, preserving legacy ancestors and descendants", () => {
  const { document, dimension, module, practice } = fixture();
  dimension.code = "LEGACY_DIMENSION";
  practice.code = "LEGACY_PRACTICE";
  module.gatingRules[0].childCode = practice.code;
  document.dimensions[1].code = "UNRELATED_DIMENSION";
  document.dimensions[1].modules[0].code = "UNRELATED_MODULE";
  module.code = "M9_Custom_SUFFIX";
  dimension.gatingRules[0].childCode = module.code.toLowerCase();
  const next = moveModule(document, dimension.clientKey, module.clientKey, 1);
  assert.equal(next.dimensions[0].code, "LEGACY_DIMENSION");
  assert.equal(next.dimensions[0].modules[1].code, "M02_Custom_SUFFIX");
  assert.equal(next.dimensions[0].gatingRules[0].childCode, "M02_Custom_SUFFIX");
  assert.equal(next.dimensions[0].modules[1].practices, module.practices);
  assert.equal(next.dimensions[0].modules[1].gatingRules, module.gatingRules);
  assert.equal(next.dimensions[1], document.dimensions[1]);
});

test("suffix truncation keeps codes within 64 characters, including three-digit positions", () => {
  assert.equal(codeWithPrefix("M01_", "A".repeat(64)), `M01_${"A".repeat(60)}`);
  assert.equal(codeWithPrefix("Q100_", "A".repeat(60)), `Q100_${"A".repeat(59)}`);
  const { document, dimension, module } = fixture();
  module.code = "A".repeat(64);
  dimension.gatingRules[0].childCode = module.code;
  const hydrated = hydrateDocument(document, false);
  assert.equal(hydrated.dimensions[0].modules[0].code, `M01_${"A".repeat(60)}`);
  const moved = moveModule(hydrated, dimension.clientKey, module.clientKey, 1);
  assert.equal(moved.dimensions[0].modules[1].code, `M02_${"A".repeat(60)}`);
  assert.equal(moved.dimensions[0].gatingRules[0].childCode, moved.dimensions[0].modules[1].code);
  const questions = Array.from({ length: 100 }, (_, index) => ({
    ...emptyQuestion(index + 1), code: `Q${index + 1}_${"A".repeat(60)}`,
  }));
  const result = renumberSiblingCodes(questions, "Q");
  assert.equal(result.items[99].code, `Q100_${"A".repeat(59)}`);
  assert.equal(new Set(result.items.map((item) => item.code)).size, 100);
});
