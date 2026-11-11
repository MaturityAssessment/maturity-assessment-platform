import type { ModelEditorModule } from "@/api/types";

export const MODULE_PREREQUISITE_ORDER_MESSAGE =
  "No module can be reordered before its prerequisites or after a module that depends on it.";

export function hasValidModulePrerequisiteOrder(modules: ModelEditorModule[]) {
  const prior = new Set<string>();
  for (const module of modules) {
    if ((module.prerequisiteModuleCodes ?? []).some((code) => !prior.has(code.toLowerCase()))) return false;
    prior.add(module.code.toLowerCase());
  }
  return true;
}

export function visibleModuleDependents(modules: ModelEditorModule[], code: string) {
  return modules.filter((module) => module.visible !== false &&
    module.prerequisiteModuleCodes?.some((reference) => reference.toLowerCase() === code.toLowerCase()));
}

/** Enabling a module also enables its entire prerequisite chain. */
export function showModulePrerequisites(modules: ModelEditorModule[]) {
  const visible = new Set(modules.filter((module) => module.visible !== false).map((module) => module.code.toLowerCase()));
  const byCode = new Map(modules.map((module) => [module.code.toLowerCase(), module]));
  const visit = (code: string) => {
    for (const reference of byCode.get(code)?.prerequisiteModuleCodes ?? []) {
      const key = reference.toLowerCase();
      if (visible.has(key)) continue;
      visible.add(key);
      visit(key);
    }
  };
  [...visible].forEach(visit);
  return modules.map((module) => visible.has(module.code.toLowerCase()) && module.visible === false
    ? { ...module, visible: true }
    : module);
}
