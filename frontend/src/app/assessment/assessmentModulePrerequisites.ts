import type { AssessmentData, MaturityModel, Module } from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import type { AssessmentEvidenceByField } from "./assessmentEvidence";
import { isPracticeRequiredComplete } from "./assessmentFlowUtils.ts";

export type ModulePrerequisiteState = {
  locked: boolean;
  complete: boolean;
  missingPrerequisites: Array<{ code: string; name: string }>;
};

/** Walk authored order so an incomplete ancestor also locks every dependent. */
export function getModulePrerequisiteStates(
  model: MaturityModel | null,
  steps: AssessmentPracticeStep[],
  responses: AssessmentData,
  evidence: AssessmentEvidenceByField
) {
  const states = new Map<Module, ModulePrerequisiteState>();
  for (const dimension of model?.dimensions ?? []) {
    const prior = new Map<string, Module>();
    for (const module of dimension.modules) {
      const missingPrerequisites = (module.prerequisiteModuleCodes ?? []).flatMap((code) => {
        const prerequisite = prior.get(code.toLowerCase());
        return prerequisite && states.get(prerequisite)?.complete
          ? []
          : [{ code, name: prerequisite?.name || code }];
      });
      const locked = module.visible === false || missingPrerequisites.length > 0;
      const moduleSteps = steps.filter((step) => step.module === module);
      states.set(module, {
        locked,
        missingPrerequisites,
        complete: !locked && moduleSteps.length === module.practices.length &&
          moduleSteps.every((step) => isPracticeRequiredComplete(step, responses, evidence)),
      });
      prior.set(module.code?.toLowerCase() ?? "", module);
    }
  }
  return states;
}
