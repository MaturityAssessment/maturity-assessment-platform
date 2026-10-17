import type {
  AggregationRule,
  GatingRule,
  MaturityLevel,
  MaturityModelEditorDocument,
  ModelEditorDimension,
  ModelEditorModule,
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import { codePrefix, renumberSiblingCodes } from "./editorCodes.ts";

export const DEFAULT_AGGREGATION_RULE: AggregationRule = "WEIGHTED_AVERAGE";

function hydrateGatingRules(rules: GatingRule[] | undefined): GatingRule[] {
  return [...(rules ?? [])]
    .sort((left, right) => left.order - right.order)
    .map((rule, order) => ({
      ...rule,
      order,
      childCode:
        rule.selection === "specificChild" ? rule.childCode : undefined,
    }));
}

function serializeGatingRules(rules: GatingRule[]) {
  return rules.map((rule, order) => ({
    ...rule,
    order,
    childCode:
      rule.selection === "specificChild" ? rule.childCode : undefined,
  }));
}

export function defaultMappingRules(levelCount: number) {
  return Array.from({ length: levelCount }, (_, index) => ({
    levelNumber: index + 1,
    minimumScore: index === 0 ? 0 : index / levelCount,
  }));
}

export const DEFAULT_LEVELS: MaturityLevel[] = [
  { number: 1, name: "Not Implemented" },
  { number: 2, name: "Initial" },
  { number: 3, name: "Managed" },
  { number: 4, name: "Defined" },
  { number: 5, name: "Optimised" },
];

const key = () => crypto.randomUUID();

function initials(value: string) {
  const result = value
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((part) => part[0].toUpperCase())
    .join("");
  return result || "ITEM";
}

export function suggestCode(
  prefix: "D" | "M" | "P" | "Q",
  ordinal: number,
  name: string
) {
  return `${codePrefix(prefix, ordinal)}${initials(name)}`;
}

export function emptyQuestion(ordinal: number): ModelEditorQuestion {
  return {
    clientKey: key(),
    code: suggestCode("Q", ordinal, "Question"),
    weight: 1,
    text: "",
    type: "boolean",
    help: "",
    required: false,
    booleanCorrectAnswer: true,
    scalePointCount: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
    scaleHighPointIsMaximum: true,
    rangeMin: 0,
    rangeMax: 100,
    rangeHighValueIsMaximum: true,
  };
}

export function emptyPractice(
  ordinal: number,
  questionOrdinal: number
): ModelEditorPractice {
  return {
    clientKey: key(),
    code: suggestCode("P", ordinal, "Practice"),
    name: "",
    description: "",
    weight: 1,
    aggregationRule: DEFAULT_AGGREGATION_RULE,
    gatingRules: [],
    requiresEvidence: false,
    questions: [emptyQuestion(questionOrdinal)],
  };
}

export function emptyModule(
  ordinal: number,
  practiceOrdinal: number,
  questionOrdinal: number
): ModelEditorModule {
  return {
    clientKey: key(),
    code: suggestCode("M", ordinal, "Module"),
    name: "",
    description: "",
    weight: 1,
    aggregationRule: DEFAULT_AGGREGATION_RULE,
    gatingRules: [],
    practices: [emptyPractice(practiceOrdinal, questionOrdinal)],
  };
}

export function emptyDimension(
  ordinal: number,
  moduleOrdinal: number,
  practiceOrdinal: number,
  questionOrdinal: number
): ModelEditorDimension {
  return {
    clientKey: key(),
    code: suggestCode("D", ordinal, "Dimension"),
    name: "",
    description: "",
    weight: 1,
    aggregationRule: DEFAULT_AGGREGATION_RULE,
    mappingRules: defaultMappingRules(DEFAULT_LEVELS.length),
    gatingRules: [],
    modules: [
      emptyModule(moduleOrdinal, practiceOrdinal, questionOrdinal),
    ],
  };
}

export function createEmptyDocument(): MaturityModelEditorDocument {
  return {
    name: "",
    description: "",
    changelogMarkdown: "",
    autoEvaluated: true,
    domainId: undefined,
    aggregationRule: DEFAULT_AGGREGATION_RULE,
    levels: DEFAULT_LEVELS.map((level) => ({ ...level })),
    dimensions: [emptyDimension(1, 1, 1, 1)],
  };
}

export function hydrateDocument(
  raw: MaturityModelEditorDocument,
  // Kept for compatibility with existing editor initialization call sites.
  _lockCodes: boolean
): MaturityModelEditorDocument {
  const levels = (raw.levels ?? DEFAULT_LEVELS).map((level, index) => ({
    ...level,
    number: index + 1,
  }));
  const document: MaturityModelEditorDocument = {
    ...raw,
    changelogMarkdown: raw.changelogMarkdown ?? "",
    autoEvaluated: raw.autoEvaluated ?? true,
    aggregationRule: raw.aggregationRule ?? DEFAULT_AGGREGATION_RULE,
    levels,
    dimensions: (raw.dimensions ?? []).map((dimension) => ({
      ...dimension,
      description: dimension.description ?? "",
      clientKey: dimension.clientKey || key(),
      codeLocked: false,
      weight: dimension.weight ?? 1,
      aggregationRule:
        dimension.aggregationRule ?? DEFAULT_AGGREGATION_RULE,
      gatingRules: hydrateGatingRules(dimension.gatingRules),
      mappingRules:
        dimension.mappingRules?.length === levels.length
          ? dimension.mappingRules.map((rule, index) => ({
              levelNumber: index + 1,
              minimumScore: rule.minimumScore,
            }))
          : defaultMappingRules(levels.length),
      modules: (dimension.modules ?? []).map((module) => ({
        ...module,
        description: module.description ?? "",
        clientKey: module.clientKey || key(),
        codeLocked: false,
        weight: module.weight ?? 1,
        aggregationRule: module.aggregationRule ?? DEFAULT_AGGREGATION_RULE,
        gatingRules: hydrateGatingRules(module.gatingRules),
        practices: (module.practices ?? []).map((practice) => ({
          ...practice,
          description: practice.description ?? "",
          requiresEvidence: practice.requiresEvidence ?? false,
          clientKey: practice.clientKey || key(),
          codeLocked: false,
          weight: practice.weight ?? 1,
          aggregationRule:
            practice.aggregationRule ?? DEFAULT_AGGREGATION_RULE,
          gatingRules: hydrateGatingRules(practice.gatingRules),
          questions: (practice.questions ?? []).map((question) => ({
            ...question,
            clientKey: question.clientKey || key(),
            codeLocked: false,
            weight: question.weight ?? 1,
            help: question.help ?? "",
            choices: question.choices?.map((choice) => ({ ...choice, ...(question.type === "multiple_choice" ? { id: choice.id || key() } : {}) })),
            required: question.required ?? false,
            booleanCorrectAnswer: question.booleanCorrectAnswer ?? true,
            scalePointCount: question.scalePointCount ?? 5,
            scaleMinLabel: question.scaleMinLabel ?? "",
            scaleMaxLabel: question.scaleMaxLabel ?? "",
            scaleHighPointIsMaximum:
              question.scaleHighPointIsMaximum ?? true,
            rangeMin: question.rangeMin ?? 0,
            rangeMax: question.rangeMax ?? 100,
            rangeHighValueIsMaximum:
              question.rangeHighValueIsMaximum ?? true,
          })),
        })),
      })),
    })),
  };
  // Initialize prefixes once; subsequent structural edits renumber only siblings.
  document.dimensions = renumberSiblingCodes(document.dimensions, "D").items;
  for (const dimension of document.dimensions) {
    const modules = renumberSiblingCodes(dimension.modules, "M", dimension.gatingRules);
    dimension.modules = modules.items;
    dimension.gatingRules = modules.gatingRules;
    for (const modelModule of dimension.modules) {
      const practices = renumberSiblingCodes(modelModule.practices, "P", modelModule.gatingRules);
      modelModule.practices = practices.items;
      modelModule.gatingRules = practices.gatingRules;
      for (const practice of modelModule.practices) {
        practice.questions = practice.questions.map((question) => {
          const parent = practice.questions.find((candidate) => candidate.code.toLowerCase() === question.dependsOnQuestionCode?.toLowerCase());
          return parent?.type === "boolean" && !question.dependencyCondition
            ? { ...question, dependencyCondition: { type: "boolean" as const, answers: [true] } } : question;
        });
        const questions = renumberSiblingCodes(practice.questions, "Q", practice.gatingRules);
        practice.questions = questions.items;
        practice.gatingRules = questions.gatingRules;
      }
    }
  }
  return document;
}

export function serializeDocument(document: MaturityModelEditorDocument) {
  return {
    name: document.name.trim(),
    description: document.description.trim(),
    changelogMarkdown: document.changelogMarkdown.trim(),
    autoEvaluated: document.autoEvaluated,
    domainId: document.domainId,
    aggregationRule: document.aggregationRule,
    levels: document.levels.map((level, index) => ({
      number: index + 1,
      name: level.name.trim(),
      description: level.description?.trim() || undefined,
    })),
    dimensions: document.dimensions.map(
      ({ clientKey: _key, codeLocked: _locked, ...dimension }) => ({
        ...dimension,
        code: dimension.code.trim(),
        name: dimension.name.trim(),
        description: dimension.description.trim() || undefined,
        gatingRules: serializeGatingRules(dimension.gatingRules),
        modules: dimension.modules.map(
          ({ clientKey: _moduleKey, codeLocked: _moduleLocked, ...module }) => ({
            ...module,
            code: module.code.trim(),
            name: module.name.trim(),
            description: module.description.trim(),
            gatingRules: serializeGatingRules(module.gatingRules),
            practices: module.practices.map(
              ({
                clientKey: _practiceKey,
                codeLocked: _practiceLocked,
                ...practice
              }) => ({
                ...practice,
                code: practice.code.trim(),
                name: practice.name.trim(),
                description: practice.description.trim(),
                gatingRules: serializeGatingRules(practice.gatingRules),
                questions: practice.questions.map(
                  ({
                    clientKey: _questionKey,
                    codeLocked: _questionLocked,
                    ...question
                  }) => ({
                    ...question,
                    code: question.code.trim(),
                    text: question.text.trim(),
                    help: question.help.trim(),
                    dependsOnQuestionCode:
                      question.dependsOnQuestionCode || undefined,
                  })
                ),
              })
            ),
          })
        ),
      })
    ),
  };
}

export function countItems(document: MaturityModelEditorDocument) {
  let modules = 0;
  let practices = 0;
  let questions = 0;
  document.dimensions.forEach((dimension) => {
    modules += dimension.modules.length;
    dimension.modules.forEach((module) => {
      practices += module.practices.length;
      module.practices.forEach((practice) => {
        questions += practice.questions.length;
      });
    });
  });
  return {
    dimensions: document.dimensions.length,
    modules,
    practices,
    questions,
  };
}
