import type {
  MaturityModelEditorDocument,
  ModelEditorDimension,
  ModelEditorModule,
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import type { Selection } from "./editorTypes";
import {
  emptyDimension,
  emptyModule,
  emptyPractice,
  emptyQuestion,
} from "./editorDocument.ts";
import { renumberSiblingCodes } from "./editorCodes.ts";

function replaceByKey<T extends { clientKey: string }>(
  items: T[],
  key: string,
  value: T
) {
  return items.map((item) => (item.clientKey === key ? value : item));
}

function moveByKey<T extends { clientKey: string }>(
  items: T[],
  key: string,
  direction: -1 | 1
) {
  const index = items.findIndex((item) => item.clientKey === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

function reorderByKey<T extends { clientKey: string }>(
  items: T[],
  activeKey: string,
  overKey: string
) {
  const oldIndex = items.findIndex((item) => item.clientKey === activeKey);
  const newIndex = items.findIndex((item) => item.clientKey === overKey);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return items;
  const copy = [...items];
  const [item] = copy.splice(oldIndex, 1);
  copy.splice(newIndex, 0, item);
  return copy;
}

export function findDimension(
  document: MaturityModelEditorDocument,
  dimensionKey: string
) {
  return document.dimensions.find(
    (dimension) => dimension.clientKey === dimensionKey
  );
}

export function findModule(
  document: MaturityModelEditorDocument,
  moduleKey: string
) {
  for (const dimension of document.dimensions) {
    const foundModule = dimension.modules.find(
      (candidate) => candidate.clientKey === moduleKey
    );
    if (foundModule) return { dimension, module: foundModule };
  }
  return null;
}

export function findPractice(
  document: MaturityModelEditorDocument,
  practiceKey: string
) {
  for (const dimension of document.dimensions) {
    for (const modelModule of dimension.modules) {
      const practice = modelModule.practices.find(
        (candidate) => candidate.clientKey === practiceKey
      );
      if (practice) return { dimension, module: modelModule, practice };
    }
  }
  return null;
}

export function findQuestion(
  document: MaturityModelEditorDocument,
  questionKey: string
) {
  for (const dimension of document.dimensions) {
    for (const modelModule of dimension.modules) {
      for (const practice of modelModule.practices) {
        const question = practice.questions.find(
          (candidate) => candidate.clientKey === questionKey
        );
        if (question) {
          return { dimension, module: modelModule, practice, question };
        }
      }
    }
  }
  return null;
}

export function findSelectedItem(
  document: MaturityModelEditorDocument,
  selection: Selection
) {
  if (selection.type === "dimension") {
    const dimension = findDimension(document, selection.key);
    return dimension ? { type: "dimension" as const, dimension } : null;
  }
  if (selection.type === "module") {
    const result = findModule(document, selection.key);
    return result ? { type: "module" as const, ...result } : null;
  }
  const result = findPractice(document, selection.key);
  return result ? { type: "practice" as const, ...result } : null;
}

function updateModuleParent(
  document: MaturityModelEditorDocument,
  moduleKey: string,
  update: (module: ModelEditorModule) => ModelEditorModule,
  renumberPractices = false
) {
  const found = findModule(document, moduleKey);
  if (!found) return document;
  let next = update(found.module);
  if (next === found.module) return document;
  if (renumberPractices && next.practices !== found.module.practices) {
    const result = renumberSiblingCodes(next.practices, "P", next.gatingRules);
    next = { ...next, practices: result.items, gatingRules: result.gatingRules };
  }
  return updateDimension(document, found.dimension.clientKey, {
    ...found.dimension,
    modules: replaceByKey(found.dimension.modules, moduleKey, next),
  });
}

function updatePracticeParent(
  document: MaturityModelEditorDocument,
  practiceKey: string,
  update: (practice: ModelEditorPractice) => ModelEditorPractice,
  renumberQuestions = false
) {
  const found = findPractice(document, practiceKey);
  if (!found) return document;
  let next = update(found.practice);
  if (next === found.practice) return document;
  if (renumberQuestions && next.questions !== found.practice.questions) {
    const result = renumberSiblingCodes(next.questions, "Q", next.gatingRules);
    next = { ...next, questions: result.items, gatingRules: result.gatingRules };
  }
  return updateModule(document, found.dimension.clientKey, found.module.clientKey, {
    ...found.module,
    practices: replaceByKey(found.module.practices, practiceKey, next),
  });
}

export function addDimension(document: MaturityModelEditorDocument) {
  const dimension = emptyDimension(
    document.dimensions.length + 1,
    1,
    1,
    1
  );
  return {
    document: {
      ...document,
      dimensions: [...document.dimensions, dimension],
    },
    dimension,
  };
}

export function updateDimension(
  document: MaturityModelEditorDocument,
  dimensionKey: string,
  dimension: ModelEditorDimension,
  renumberModules = false
) {
  if (renumberModules && dimension.modules !== findDimension(document, dimensionKey)?.modules) {
    const result = renumberSiblingCodes(dimension.modules, "M", dimension.gatingRules);
    dimension = { ...dimension, modules: result.items, gatingRules: result.gatingRules };
  }
  return {
    ...document,
    dimensions: replaceByKey(document.dimensions, dimensionKey, dimension),
  };
}

export function moveDimension(
  document: MaturityModelEditorDocument,
  dimensionKey: string,
  direction: -1 | 1
) {
  const dimensions = moveByKey(document.dimensions, dimensionKey, direction);
  if (dimensions === document.dimensions) return document;
  return {
    ...document,
    dimensions: renumberSiblingCodes(dimensions, "D").items,
  };
}

export function deleteDimension(
  document: MaturityModelEditorDocument,
  dimensionKey: string
) {
  if (!findDimension(document, dimensionKey)) return document;
  return {
    ...document,
    dimensions: renumberSiblingCodes(
      document.dimensions.filter((dimension) => dimension.clientKey !== dimensionKey),
      "D"
    ).items,
  };
}

export function reorderDimension(
  document: MaturityModelEditorDocument,
  activeKey: string,
  overKey: string
) {
  const dimensions = reorderByKey(document.dimensions, activeKey, overKey);
  if (dimensions === document.dimensions) return document;
  return {
    ...document,
    dimensions: renumberSiblingCodes(dimensions, "D").items,
  };
}

export function addModule(
  document: MaturityModelEditorDocument,
  dimensionKey: string
) {
  const dimension = findDimension(document, dimensionKey);
  if (!dimension) return document;
  const newModule = emptyModule(
    dimension.modules.length + 1,
    1,
    1
  );
  return updateDimension(document, dimensionKey, {
    ...dimension,
    modules: [...dimension.modules, newModule],
  });
}

export function updateModule(
  document: MaturityModelEditorDocument,
  dimensionKey: string,
  moduleKey: string,
  module: ModelEditorModule
) {
  const dimension = findDimension(document, dimensionKey);
  if (!dimension) return document;
  const previous = dimension.modules.find(
    (candidate) => candidate.clientKey === moduleKey
  );
  return updateDimension(document, dimensionKey, {
    ...dimension,
    gatingRules: previous
      ? dimension.gatingRules.map((rule) =>
          rule.selection === "specificChild" &&
          rule.childCode?.toLowerCase() === previous.code.toLowerCase() &&
          previous.code !== module.code
            ? { ...rule, childCode: module.code }
            : rule
        )
      : dimension.gatingRules,
    modules: replaceByKey(dimension.modules, moduleKey, module),
  });
}

export function moveModule(
  document: MaturityModelEditorDocument,
  dimensionKey: string,
  moduleKey: string,
  direction: -1 | 1
) {
  const dimension = findDimension(document, dimensionKey);
  if (!dimension) return document;
  return updateDimension(document, dimensionKey, {
    ...dimension,
    modules: moveByKey(dimension.modules, moduleKey, direction),
  }, true);
}

export function reorderModule(
  document: MaturityModelEditorDocument,
  dimensionKey: string,
  activeKey: string,
  overKey: string
) {
  const dimension = findDimension(document, dimensionKey);
  if (!dimension) return document;
  return updateDimension(document, dimensionKey, {
    ...dimension,
    modules: reorderByKey(dimension.modules, activeKey, overKey),
  }, true);
}

export function deleteModule(
  document: MaturityModelEditorDocument,
  dimensionKey: string,
  moduleKey: string
) {
  const dimension = findDimension(document, dimensionKey);
  if (!dimension) return document;
  const removed = dimension.modules.find(
    (module) => module.clientKey === moduleKey
  );
  if (!removed) return document;
  return updateDimension(document, dimensionKey, {
    ...dimension,
    gatingRules: dimension.gatingRules.filter(
      (rule) =>
        rule.selection !== "specificChild" ||
        rule.childCode?.toLowerCase() !== removed.code.toLowerCase()
    ),
    modules: dimension.modules.filter(
      (module) => module.clientKey !== moduleKey
    ),
  }, true);
}

export function addPractice(
  document: MaturityModelEditorDocument,
  moduleKey: string
) {
  return updateModuleParent(document, moduleKey, (module) => ({
    ...module,
    practices: [
      ...module.practices,
      emptyPractice(module.practices.length + 1, 1),
    ],
  }));
}

export function updatePractice(
  document: MaturityModelEditorDocument,
  moduleKey: string,
  practiceKey: string,
  practice: ModelEditorPractice
) {
  return updateModuleParent(document, moduleKey, (module) => {
    const previous = module.practices.find(
      (candidate) => candidate.clientKey === practiceKey
    );
    return {
      ...module,
      gatingRules: previous
        ? module.gatingRules.map((rule) =>
            rule.selection === "specificChild" &&
            rule.childCode?.toLowerCase() === previous.code.toLowerCase() &&
            previous.code !== practice.code
              ? { ...rule, childCode: practice.code }
              : rule
          )
        : module.gatingRules,
      practices: replaceByKey(module.practices, practiceKey, practice),
    };
  });
}

export function movePractice(
  document: MaturityModelEditorDocument,
  moduleKey: string,
  practiceKey: string,
  direction: -1 | 1
) {
  return updateModuleParent(document, moduleKey, (module) => ({
    ...module,
    practices: moveByKey(module.practices, practiceKey, direction),
  }), true);
}

export function reorderPractice(
  document: MaturityModelEditorDocument,
  moduleKey: string,
  activeKey: string,
  overKey: string
) {
  return updateModuleParent(document, moduleKey, (module) => ({
    ...module,
    practices: reorderByKey(module.practices, activeKey, overKey),
  }), true);
}

export function deletePractice(
  document: MaturityModelEditorDocument,
  moduleKey: string,
  practiceKey: string
) {
  return updateModuleParent(document, moduleKey, (module) => {
    const removed = module.practices.find(
      (practice) => practice.clientKey === practiceKey
    );
    if (!removed) return module;
    return {
      ...module,
      gatingRules: module.gatingRules.filter(
        (rule) =>
          rule.selection !== "specificChild" ||
          rule.childCode?.toLowerCase() !== removed.code.toLowerCase()
      ),
      practices: module.practices.filter(
        (practice) => practice.clientKey !== practiceKey
      ),
    };
  }, true);
}

export function addQuestion(
  document: MaturityModelEditorDocument,
  practiceKey: string
) {
  return updatePracticeParent(document, practiceKey, (practice) => ({
    ...practice,
    questions: [
      ...practice.questions,
      emptyQuestion(practice.questions.length + 1),
    ],
  }));
}

export function updateQuestion(
  document: MaturityModelEditorDocument,
  practiceKey: string,
  questionKey: string,
  question: ModelEditorQuestion
) {
  return updatePracticeParent(document, practiceKey, (practice) => {
    const previous = practice.questions.find(
      (candidate) => candidate.clientKey === questionKey
    );
    if (!previous) return practice;
    return {
      ...practice,
      gatingRules: practice.gatingRules.map((rule) =>
        rule.selection === "specificChild" &&
        rule.childCode?.toLowerCase() === previous.code.toLowerCase() &&
        previous.code !== question.code
          ? { ...rule, childCode: question.code }
          : rule
      ),
      questions: practice.questions.map((candidate) => {
        if (candidate.clientKey === questionKey) return question;
        if (
          previous.code !== question.code &&
          candidate.dependsOnQuestionCode?.toLowerCase() ===
            previous.code.toLowerCase()
        ) {
          return { ...candidate, dependsOnQuestionCode: question.code };
        }
        return candidate;
      }),
    };
  });
}

export function moveQuestion(
  document: MaturityModelEditorDocument,
  practiceKey: string,
  questionKey: string,
  direction: -1 | 1
) {
  return updatePracticeParent(document, practiceKey, (practice) => ({
    ...practice,
    questions: moveByKey(practice.questions, questionKey, direction),
  }), true);
}

export function reorderQuestion(
  document: MaturityModelEditorDocument,
  practiceKey: string,
  activeKey: string,
  overKey: string
) {
  return updatePracticeParent(document, practiceKey, (practice) => ({
    ...practice,
    questions: reorderByKey(practice.questions, activeKey, overKey),
  }), true);
}

export function deleteQuestion(
  document: MaturityModelEditorDocument,
  practiceKey: string,
  questionKey: string
) {
  return updatePracticeParent(document, practiceKey, (practice) => {
    const question = practice.questions.find(
      (candidate) => candidate.clientKey === questionKey
    );
    if (!question) return practice;
    return {
      ...practice,
      gatingRules: practice.gatingRules.filter(
        (rule) =>
          rule.selection !== "specificChild" ||
          rule.childCode?.toLowerCase() !== question.code.toLowerCase()
      ),
      questions: practice.questions
        .filter((candidate) => candidate.clientKey !== questionKey)
        .map((candidate) =>
          candidate.dependsOnQuestionCode?.toLowerCase() ===
          question.code.toLowerCase()
            ? { ...candidate, dependsOnQuestionCode: undefined }
            : candidate
        ),
    };
  }, true);
}

export function changeQuestionType(
  question: ModelEditorQuestion,
  type: ModelEditorQuestion["type"],
  _maxLevel: number
): ModelEditorQuestion {
  return {
    ...question,
    type,
    weight: question.weight || 1,
    required: question.required,
    booleanCorrectAnswer: question.booleanCorrectAnswer ?? true,
    scalePointCount: question.scalePointCount ?? 5,
    scaleMinLabel: question.scaleMinLabel ?? "",
    scaleMaxLabel: question.scaleMaxLabel ?? "",
    scaleHighPointIsMaximum: question.scaleHighPointIsMaximum ?? true,
    rangeMin: question.rangeMin ?? 0,
    rangeMax: question.rangeMax ?? 100,
    rangeHighValueIsMaximum: question.rangeHighValueIsMaximum ?? true,
    choices:
      type === "multiple_choice" || type === "multiple_selection"
        ? question.choices?.length
          ? question.choices.map((choice) => ({ ...choice, rawValue: choice.rawValue ?? choice.score }))
          : [
              { label: "", score: 0, rawValue: 0 },
              { label: "", score: 1, rawValue: 1 },
            ]
        : undefined,
  };
}
