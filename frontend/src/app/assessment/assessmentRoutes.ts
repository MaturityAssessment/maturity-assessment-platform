import type { Dimension, MaturityModel, Module } from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";

const ASSESSMENT_ROOT = "/assessment";

export type AssessmentRouteContext = {
  draftId?: number;
  campaignToken?: string;
};

export type ResolvedAssessmentPractice = {
  step: AssessmentPracticeStep;
  dimensionIndex: number;
  moduleIndex: number;
  practiceIndex: number;
  canonicalPath: string;
};

export type ResolvedAssessmentModule = {
  key: string;
  dimension: Dimension;
  module: Module;
  dimensionIndex: number;
  moduleIndex: number;
  canonicalPath: string;
};

export function buildPracticeSteps(
  maturityModel: MaturityModel | null
): AssessmentPracticeStep[] {
  if (!maturityModel) return [];

  return maturityModel.dimensions.flatMap((dimension, dimensionIndex) =>
    dimension.modules.flatMap((module, moduleIndex) =>
      module.practices.map((practice, practiceIndex) => ({
        key: getPracticeKey(
          dimensionIndex,
          moduleIndex,
          practiceIndex,
          practice.id
        ),
        dimension,
        module,
        practice,
      }))
    )
  );
}

export function getPracticeKey(
  dimensionIndex: number,
  moduleIndex: number,
  practiceIndex: number,
  practiceId?: number
) {
  return practiceId
    ? `practice-${practiceId}`
    : `practice-${dimensionIndex}-${moduleIndex}-${practiceIndex}`;
}

export function getModuleKey(
  dimensionIndex: number,
  moduleIndex: number,
  moduleCode?: string
) {
  return moduleCode?.trim()
    ? `module-${moduleCode.trim().toLocaleLowerCase()}`
    : `module-${dimensionIndex}-${moduleIndex}`;
}

export function getModulePracticeSteps(
  practiceSteps: AssessmentPracticeStep[],
  activePractice: AssessmentPracticeStep | null
) {
  if (!activePractice) return [];
  return practiceSteps.filter(
    (step) =>
      step.dimension === activePractice.dimension &&
      step.module === activePractice.module
  );
}

export function getNextPracticeInModule(
  modulePracticeSteps: AssessmentPracticeStep[],
  activePracticeKey: string
) {
  const activeIndex = modulePracticeSteps.findIndex(
    (step) => step.key === activePracticeKey
  );
  return activeIndex >= 0 ? modulePracticeSteps[activeIndex + 1] ?? null : null;
}

export function buildAssessmentOverviewHref(
  context: AssessmentRouteContext | null
) {
  return replaceAssessmentPathContext(ASSESSMENT_ROOT, context);
}

export function buildAssessmentPracticeHref(
  step: AssessmentPracticeStep,
  context: AssessmentRouteContext | null
) {
  const dimensionCode = requireRouteCode(
    step.dimension.id,
    "dimension"
  );
  const moduleCode = requireRouteCode(step.module.code, "module");
  const practiceCode = requireRouteCode(step.practice.code, "practice");
  const path = `${ASSESSMENT_ROOT}/${encodeURIComponent(
    dimensionCode
  )}/${encodeURIComponent(moduleCode)}/${encodeURIComponent(practiceCode)}`;

  return replaceAssessmentPathContext(path, context);
}

export function buildAssessmentModuleHref(
  dimension: Dimension,
  module: Module,
  context: AssessmentRouteContext | null
) {
  const dimensionCode = requireRouteCode(dimension.id, "dimension");
  const moduleCode = requireRouteCode(module.code, "module");
  const path = `${ASSESSMENT_ROOT}/${encodeURIComponent(
    dimensionCode
  )}/${encodeURIComponent(moduleCode)}`;

  return replaceAssessmentPathContext(path, context);
}

export function buildAssessmentParentHref(
  maturityModel: MaturityModel,
  pathname: string,
  context: AssessmentRouteContext | null
) {
  const practiceLocation = resolveAssessmentPracticeLocation(
    maturityModel,
    pathname
  );
  if (practiceLocation) {
    return buildAssessmentModuleHref(
      practiceLocation.step.dimension,
      practiceLocation.step.module,
      context
    );
  }

  if (resolveAssessmentModuleLocation(maturityModel, pathname)) {
    return buildAssessmentOverviewHref(context);
  }

  return null;
}

export function replaceAssessmentPathContext(
  pathname: string,
  context: AssessmentRouteContext | null
) {
  const search = new URLSearchParams();
  if (context?.campaignToken) {
    search.set("campaignToken", context.campaignToken);
  } else if (
    context?.draftId &&
    Number.isSafeInteger(context.draftId) &&
    context.draftId > 0
  ) {
    search.set("draftId", String(context.draftId));
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function readAssessmentRouteContext(
  search: string
): AssessmentRouteContext | null {
  const params = new URLSearchParams(search);
  if (params.has("modelId")) return null;

  const campaignToken = params.get("campaignToken")?.trim();
  if (campaignToken && /^[A-Za-z0-9_-]{43}$/.test(campaignToken)) {
    return { campaignToken };
  }

  const draftId = readPositiveInteger(params.get("draftId"));
  return draftId ? { draftId } : null;
}

export function isAssessmentPracticePath(pathname: string) {
  return parsePracticeSegments(pathname) !== null;
}

export function isAssessmentModulePath(pathname: string) {
  return parseModuleSegments(pathname) !== null;
}

export function resolveAssessmentModuleLocation(
  maturityModel: MaturityModel,
  pathname: string
): ResolvedAssessmentModule | null {
  const segments = parseModuleSegments(pathname);
  if (!segments) return null;

  const dimensionIndex = maturityModel.dimensions.findIndex(
    (dimension) => normalizedCode(dimension.id) === normalizedCode(segments[0])
  );
  const dimension = maturityModel.dimensions[dimensionIndex];
  if (!dimension) return null;

  const moduleIndex = dimension.modules.findIndex(
    (module) => normalizedCode(module.code) === normalizedCode(segments[1])
  );
  const maturityModule = dimension.modules[moduleIndex];
  if (!maturityModule) return null;

  return {
    key: getModuleKey(dimensionIndex, moduleIndex, maturityModule.code),
    dimension,
    module: maturityModule,
    dimensionIndex,
    moduleIndex,
    canonicalPath: buildAssessmentModuleHref(
      dimension,
      maturityModule,
      null
    ),
  };
}

export function resolveAssessmentPracticeLocation(
  maturityModel: MaturityModel,
  pathname: string
): ResolvedAssessmentPractice | null {
  const segments = parsePracticeSegments(pathname);
  if (!segments) return null;

  const dimensionIndex = maturityModel.dimensions.findIndex(
    (dimension) => normalizedCode(dimension.id) === normalizedCode(segments[0])
  );
  const dimension = maturityModel.dimensions[dimensionIndex];
  if (!dimension) return null;

  const moduleIndex = dimension.modules.findIndex(
    (module) => normalizedCode(module.code) === normalizedCode(segments[1])
  );
  const maturityModule = dimension.modules[moduleIndex];
  if (!maturityModule) return null;

  const practiceIndex = maturityModule.practices.findIndex(
    (practice) => normalizedCode(practice.code) === normalizedCode(segments[2])
  );
  const practice = maturityModule.practices[practiceIndex];
  if (!practice) return null;

  const step = {
    key: getPracticeKey(
      dimensionIndex,
      moduleIndex,
      practiceIndex,
      practice.id
    ),
    dimension,
    module: maturityModule,
    practice,
  };

  return {
    step,
    dimensionIndex,
    moduleIndex,
    practiceIndex,
    canonicalPath: buildAssessmentPracticeHref(step, null),
  };
}

function parsePracticeSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length !== 4 ||
    segments[0].toLocaleLowerCase() !== "assessment"
  ) {
    return null;
  }

  try {
    return segments.slice(1).map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function parseModuleSegments(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length !== 3 ||
    segments[0].toLocaleLowerCase() !== "assessment"
  ) {
    return null;
  }

  try {
    return segments.slice(1).map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function normalizedCode(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function requireRouteCode(value: string | undefined, level: string) {
  const code = value?.trim();
  if (!code) {
    throw new Error(`Cannot build assessment route without a ${level} code.`);
  }
  return code;
}

function readPositiveInteger(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
