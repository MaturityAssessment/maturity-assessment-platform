import type { ModelEditorDimension, ModelEditorModule } from "@/api/types";

export function moduleVisibilityDependencies(
  dimension: ModelEditorDimension,
  module: ModelEditorModule
): string[] {
  return dimension.gatingRules.flatMap((rule, index) => {
    if (rule.selection === "specificChild") {
      return rule.childCode?.toLowerCase() === module.code.toLowerCase()
        ? [`Gating rule ${index + 1} in ${dimension.name || dimension.code} explicitly references ${module.code}. Fix this rule or restore visibility before saving.`]
        : [];
    }
    return [`Gating rule ${index + 1} in ${dimension.name || dimension.code} uses ${rule.selection === "allChildren" ? "all" : "any"} modules. It will evaluate only visible modules.`];
  });
}
