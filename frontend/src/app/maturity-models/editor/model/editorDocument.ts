import type {
  AggregationRule,
  MaturityLevel,
  MaturityModelEditorDocument,
  ModelEditorDimension,
  ModelEditorModule,
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import { repairConditionalReferences } from "./conditionalGating.ts";
import { normalizeModuleRelationships } from "./moduleRelationships.ts";
import { codePrefix, renumberSiblingCodes } from "./editorCodes.ts";

export const DEFAULT_AGGREGATION_RULE: AggregationRule = "WEIGHTED_AVERAGE";

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
    allowNotApplicable: false,
    notApplicableScore: null,
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
    minimumCoverage: 0,
    minimumIncludedCount: 0,
    childStateGatingRules: [],
    conditionalGatingRules: [],
    requiresEvidence: false,
    evidenceRequirements: [],
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
    minimumCoverage: 0,
    minimumIncludedCount: 0,
    childStateGatingRules: [],
    conditionalGatingRules: [],
    visible: true,
    prerequisiteModuleCodes: [],
    coRequisiteModuleCodes: [],
    mutexModuleCodes: [],
    mandatoryBadge: false,
    reinforcesModuleCodes: [],
    substitutesModuleCodes: [],
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
    minimumCoverage: 0,
    minimumIncludedCount: 0,
    childStateGatingRules: [],
    conditionalGatingRules: [],
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

// Older drafts may still contain retired score-adjustment rules.
function withoutLegacyGating<T extends object>(item: T): T {
  const { gatingRules: _legacyRules, ...fields } = item as T & { gatingRules?: unknown };
  return fields as T;
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
      ...withoutLegacyGating(dimension),
      description: dimension.description ?? "",
      clientKey: dimension.clientKey || key(),
      codeLocked: false,
      weight: dimension.weight ?? 1,
      aggregationRule:
        dimension.aggregationRule ?? DEFAULT_AGGREGATION_RULE,
      minimumCoverage: dimension.minimumCoverage ?? 0,
      minimumIncludedCount: dimension.minimumIncludedCount ?? 0,
      childStateGatingRules: (dimension.childStateGatingRules ?? []).map(rule => ({ ...rule })),
      conditionalGatingRules: structuredClone(dimension.conditionalGatingRules ?? []),
      completionGatingMetadata: dimension.completionGatingMetadata ? { ...dimension.completionGatingMetadata } : undefined,
      mappingRules:
        dimension.mappingRules?.length === levels.length
          ? dimension.mappingRules.map((rule, index) => ({
              levelNumber: index + 1,
              minimumScore: rule.minimumScore,
            }))
          : defaultMappingRules(levels.length),
      modules: (dimension.modules ?? []).map((module) => ({
        ...withoutLegacyGating(module),
        description: module.description ?? "",
        visible: module.visible !== false,
        prerequisiteModuleCodes: [...(module.prerequisiteModuleCodes ?? [])],
        coRequisiteModuleCodes: [...(module.coRequisiteModuleCodes ?? [])],
        mutexModuleCodes: [...(module.mutexModuleCodes ?? [])],
        mandatoryBadge: module.mandatoryBadge === true,
        reinforcesModuleCodes: [...(module.reinforcesModuleCodes ?? [])],
        substitutesModuleCodes: [...(module.substitutesModuleCodes ?? [])],
        clientKey: module.clientKey || key(),
        codeLocked: false,
        weight: module.weight ?? 1,
        aggregationRule: module.aggregationRule ?? DEFAULT_AGGREGATION_RULE,
        minimumCoverage: module.minimumCoverage ?? 0,
        minimumIncludedCount: module.minimumIncludedCount ?? 0,
        childStateGatingRules: (module.childStateGatingRules ?? []).map(rule => ({ ...rule })),
        conditionalGatingRules: structuredClone(module.conditionalGatingRules ?? []),
        completionGatingMetadata: module.completionGatingMetadata ? { ...module.completionGatingMetadata } : undefined,
        practices: (module.practices ?? []).map((practice) => ({
          ...withoutLegacyGating(practice),
          description: practice.description ?? "",
          requiresEvidence: practice.requiresEvidence ?? false,
          evidenceRequirements: (practice.evidenceRequirements?.length ? practice.evidenceRequirements : practice.requiresEvidence
            ? [{ code: "supporting-evidence", name: "Supporting evidence", instructions: "Use the document approval date or reporting-period end.", required: true, format: "ANY" as const }] : []).map(item => ({ ...item, frequency: item.frequency ?? "adhoc", maxAgeDays: item.maxAgeDays ?? null })),
          clientKey: practice.clientKey || key(),
          codeLocked: false,
          weight: practice.weight ?? 1,
          aggregationRule:
            practice.aggregationRule ?? DEFAULT_AGGREGATION_RULE,
          minimumCoverage: practice.minimumCoverage ?? 0,
          minimumIncludedCount: practice.minimumIncludedCount ?? 0,
          childStateGatingRules: (practice.childStateGatingRules ?? []).map(rule => ({ ...rule })),
          conditionalGatingRules: structuredClone(practice.conditionalGatingRules ?? []),
          completionGatingMetadata: practice.completionGatingMetadata ? { ...practice.completionGatingMetadata } : undefined,
          questions: (practice.questions ?? []).map((question) => ({
            ...question,
            clientKey: question.clientKey || key(),
            codeLocked: false,
            weight: question.weight ?? 1,
            help: question.help ?? "",
            choices: question.choices?.map((choice) => ({ ...choice, ...(["multiple_choice", "multiple_selection"].includes(question.type) ? { id: choice.id || key() } : {}) })),
            required: question.required ?? false,
            booleanCorrectAnswer: question.booleanCorrectAnswer ?? true,
            allowNotApplicable: question.allowNotApplicable ?? false,
            notApplicableScore: question.notApplicableScore ?? null,
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
  const beforeRenumber = structuredClone(document);
  // Initialize prefixes once; subsequent structural edits renumber only siblings.
  document.dimensions = renumberSiblingCodes(document.dimensions, "D").items;
  for (const dimension of document.dimensions) {
    const modules = renumberSiblingCodes(dimension.modules, "M");
    dimension.modules = normalizeModuleRelationships(modules.items);

    for (const modelModule of dimension.modules) {
      const practices = renumberSiblingCodes(modelModule.practices, "P");
      modelModule.practices = practices.items;

      for (const practice of modelModule.practices) {
        practice.questions = practice.questions.map((question) => {
          const parent = practice.questions.find((candidate) => candidate.code.toLowerCase() === question.dependsOnQuestionCode?.toLowerCase());
          return parent?.type === "boolean" && !question.dependencyCondition
            ? { ...question, dependencyCondition: { type: "boolean" as const, answers: [true] } } : question;
        });
        const questions = renumberSiblingCodes(practice.questions, "Q");
        practice.questions = questions.items;
      }
    }
  }
  return repairConditionalReferences(beforeRenumber, document);
}

// Keep configured weights when switching rules; unfinished unused weights must
// still satisfy the API's numeric constraints when the model is saved.
function serializeWeight(weight: number, parentRule: AggregationRule, allowZero = false) {
  const valid = Number.isFinite(weight) && (allowZero ? weight >= 0 : weight > 0);
  return parentRule !== "WEIGHTED_AVERAGE" && !valid ? 1 : weight;
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
        ...withoutLegacyGating(dimension),
        weight: serializeWeight(dimension.weight, document.aggregationRule),
        code: dimension.code.trim(),
        name: dimension.name.trim(),
        description: dimension.description.trim() || undefined,
        minimumCoverage: dimension.minimumCoverage ?? 0,
        minimumIncludedCount: dimension.minimumIncludedCount ?? 0,
        childStateGatingRules: (dimension.childStateGatingRules ?? []).map(rule => ({ ...rule })),
        conditionalGatingRules: structuredClone(dimension.conditionalGatingRules ?? []),
        completionGatingMetadata: dimension.completionGatingMetadata ? { ...dimension.completionGatingMetadata } : undefined,
        modules: dimension.modules.map(
          ({ clientKey: _moduleKey, codeLocked: _moduleLocked, ...module }) => ({
            ...withoutLegacyGating(module),
            weight: serializeWeight(module.weight, dimension.aggregationRule),
            visible: module.visible !== false,
            prerequisiteModuleCodes: [...(module.prerequisiteModuleCodes ?? [])],
            coRequisiteModuleCodes: [...(module.coRequisiteModuleCodes ?? [])],
            mutexModuleCodes: [...(module.mutexModuleCodes ?? [])],
            mandatoryBadge: module.mandatoryBadge === true,
            reinforcesModuleCodes: [...(module.reinforcesModuleCodes ?? [])],
            substitutesModuleCodes: [...(module.substitutesModuleCodes ?? [])],
            code: module.code.trim(),
            name: module.name.trim(),
            description: module.description.trim(),
            minimumCoverage: module.minimumCoverage ?? 0,
            minimumIncludedCount: module.minimumIncludedCount ?? 0,
            childStateGatingRules: (module.childStateGatingRules ?? []).map(rule => ({ ...rule })),
            conditionalGatingRules: structuredClone(module.conditionalGatingRules ?? []),
            completionGatingMetadata: module.completionGatingMetadata ? { ...module.completionGatingMetadata } : undefined,
            practices: module.practices.map(
              ({
                clientKey: _practiceKey,
                codeLocked: _practiceLocked,
                ...practice
              }) => ({
                ...withoutLegacyGating(practice),
                weight: serializeWeight(practice.weight, module.aggregationRule),
                requiresEvidence: (practice.evidenceRequirements ?? []).some(item => item.required),
                evidenceRequirements: (practice.evidenceRequirements ?? []).map(item => ({ ...item, name: item.name.trim(), instructions: item.instructions.trim() })),
                code: practice.code.trim(),
                name: practice.name.trim(),
                description: practice.description.trim(),
                minimumCoverage: practice.minimumCoverage ?? 0,
                minimumIncludedCount: practice.minimumIncludedCount ?? 0,
                childStateGatingRules: (practice.childStateGatingRules ?? []).map(rule => ({ ...rule })),
                conditionalGatingRules: structuredClone(practice.conditionalGatingRules ?? []),
                completionGatingMetadata: practice.completionGatingMetadata ? { ...practice.completionGatingMetadata } : undefined,
                questions: practice.questions.map(
                  ({
                    clientKey: _questionKey,
                    codeLocked: _questionLocked,
                    ...question
                  }) => ({
                    ...question,
                    weight: serializeWeight(question.weight, practice.aggregationRule, !question.required),
                    code: question.code.trim(),
                    text: question.text.trim(),
                    help: question.help.trim(),
                    allowNotApplicable: question.allowNotApplicable ?? false,
                    notApplicableScore: question.allowNotApplicable ? question.notApplicableScore : null,
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
