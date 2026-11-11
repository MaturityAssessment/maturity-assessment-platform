import type { MaturityModel } from "@/api/types";

/** Assessment projection: keep the full authored structure in the model editor. */
export function visibleAssessmentModel(model: MaturityModel): MaturityModel {
  return {
    ...model,
    dimensions: model.dimensions
      .map((dimension) => ({
        ...dimension,
        modules: dimension.modules.filter((module) => module.visible !== false),
      }))
      .filter((dimension) => dimension.modules.length > 0),
  };
}
