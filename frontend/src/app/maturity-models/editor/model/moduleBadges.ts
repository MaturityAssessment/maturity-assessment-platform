import type { ModelEditorDimension, ModelEditorModule } from "@/api/types";

/** Directional editor notes. Keep these out of relationship and evaluation rules. */
export const MODULE_BADGE_REFERENCE_FIELDS = ["reinforcesModuleCodes", "substitutesModuleCodes"] as const;

export function getModuleBadges(dimension: ModelEditorDimension, module: ModelEditorModule) {
  const badges: Array<{ key: string; label: string; title: string; color: "violet" | "cyan" | "gray" }> = [];
  if (module.mandatoryBadge) badges.push({ key: "mandatory", label: "Mandatory", title: "Editor note only; does not enforce visibility or completion.", color: "violet" });
  for (const field of MODULE_BADGE_REFERENCE_FIELDS) {
    const verb = field === "reinforcesModuleCodes" ? "Reinforces" : "Substitutes";
    for (const code of module[field] ?? []) {
      const target = dimension.modules.find((candidate) => candidate.code.toLowerCase() === code.toLowerCase());
      badges.push({ key: `${field}:${code}`, label: `${verb} ${target?.name || code}`,
        title: `${verb} ${target?.name || code} (${target?.code || code}). Editor note only.`, color: field === "reinforcesModuleCodes" ? "cyan" : "gray" });
    }
  }
  return badges;
}
