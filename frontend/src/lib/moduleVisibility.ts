import type { MaturityModel } from "@/api/types";

/** Assessment projection: keep the full authored structure in the model editor. */
export function visibleAssessmentModel(model: MaturityModel): MaturityModel {
  return {
    ...model,
    dimensions: model.dimensions
      .map((dimension) => ({
        ...dimension,
        // Editor notes do not belong in assessment views or exported evaluator context.
        modules: dimension.modules.filter((module) => module.visible !== false).map(({
          mandatoryBadge: _mandatory, reinforcesModuleCodes: _reinforces,
          substitutesModuleCodes: _substitutes, ...module
        }) => module),
      }))
      .filter((dimension) => dimension.modules.length > 0),
  };
}
