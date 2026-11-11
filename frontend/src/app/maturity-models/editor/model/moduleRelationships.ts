import type { ModelEditorModule } from "@/api/types";

export const SYMMETRIC_RELATION_FIELDS = ["coRequisiteModuleCodes", "mutexModuleCodes"] as const;
export const MODULE_RELATION_FIELDS = ["prerequisiteModuleCodes", ...SYMMETRIC_RELATION_FIELDS] as const;
export type SymmetricRelationField = typeof SYMMETRIC_RELATION_FIELDS[number];
export type RelationshipIssue = { code: string; kind: "structure" | "visibility"; message: string };
type Module = Pick<ModelEditorModule, "code" | "name" | "visible" | typeof MODULE_RELATION_FIELDS[number]>;
const key = (code: string) => code.trim().toLowerCase();

/** Full documents may declare an edge on either endpoint; the editor displays both. */
export function normalizeModuleRelationships<T extends Module>(modules: T[]): T[] {
  const byCode = new Map(modules.map((module) => [key(module.code), module]));
  return modules.map((module) => {
    const fields = Object.fromEntries(SYMMETRIC_RELATION_FIELDS.map((field) => {
      const codes = new Set((module[field] ?? []).map(key));
      for (const other of modules) if (other[field]?.some((code) => key(code) === key(module.code))) codes.add(key(other.code));
      return [field, [...codes].map((code) => byCode.get(code)?.code ?? code)
        .sort((a, b) => modules.findIndex((item) => key(item.code) === key(a)) - modules.findIndex((item) => key(item.code) === key(b)))];
    }));
    return { ...module, ...fields };
  });
}

/** Editing either endpoint also adds/removes the reciprocal selection. */
export function synchronizeModuleRelationships<T extends Module>(modules: T[], editedCode: string): T[] {
  const edited = modules.find((module) => key(module.code) === key(editedCode));
  if (!edited) return modules;
  return normalizeModuleRelationships(modules.map((module) => {
    if (module === edited) return module;
    return { ...module, ...Object.fromEntries(SYMMETRIC_RELATION_FIELDS.map((field) => {
      const codes = (module[field] ?? []).filter((code) => key(code) !== key(edited.code));
      if (edited[field]?.some((code) => key(code) === key(module.code))) codes.push(edited.code);
      return [field, codes];
    })) };
  }));
}

/** Visibility implications: prerequisite edges are directed, co-requisites are symmetric. */
export function moduleVisibilityClosure(modules: Module[], code: string, coOnly = false) {
  const byCode = new Map(modules.map((module) => [key(module.code), module]));
  const neighbors = new Map(modules.map((module) => [key(module.code), new Set([
    ...(coOnly ? [] : module.prerequisiteModuleCodes ?? []), ...(module.coRequisiteModuleCodes ?? []),
  ].map(key))]));
  for (const module of modules) for (const reference of module.coRequisiteModuleCodes ?? []) {
    neighbors.get(key(reference))?.add(key(module.code));
  }
  const paths = new Map<string, string[]>();
  if (!byCode.has(key(code))) return paths;
  paths.set(key(code), [byCode.get(key(code))!.code]);
  for (const [current, path] of paths) {
    for (const reference of neighbors.get(current) ?? []) if (byCode.has(reference) && !paths.has(reference)) {
      paths.set(reference, [...path, byCode.get(reference)!.code]);
    }
  }
  return paths;
}

export function moduleRelationshipIssues(modules: Module[], options: { firstStructuralIssueOnly?: boolean } = {}): RelationshipIssue[] {
  const issues: RelationshipIssue[] = [];
  const byCode = new Map(modules.map((module) => [key(module.code), module]));
  for (const module of modules) for (const field of SYMMETRIC_RELATION_FIELDS) {
    const seen = new Set<string>();
    for (const reference of module[field] ?? []) {
      const target = byCode.get(key(reference));
      if (!target || target === module || seen.has(key(reference))) issues.push({ code: module.code, kind: "structure",
        message: `${module.name || module.code}: ${field === "mutexModuleCodes" ? "mutually exclusive" : "co-requisite"} modules must be distinct other modules in this dimension (${reference}).` });
      seen.add(key(reference));
    }
  }
  const normalized = normalizeModuleRelationships(modules);
  const conflicts = new Set<string>();
  for (const root of normalized) {
    const closure = moduleVisibilityClosure(normalized, root.code);
    for (const module of normalized) {
      if (!closure.has(key(module.code))) continue;
      for (const reference of module.mutexModuleCodes ?? []) {
        if (!closure.has(key(reference))) continue;
        const pair = [key(module.code), key(reference)].sort().join("|");
        if (conflicts.has(pair)) continue;
        conflicts.add(pair);
        issues.push({ code: root.code, kind: "structure", message:
          `${root.name || root.code} requires visibility of both ${module.code} and ${reference}, which are mutually exclusive. Visibility paths: ${closure.get(key(module.code))!.join(" → ")}; ${closure.get(key(reference))!.join(" → ")}.` });
        if (options.firstStructuralIssueOnly) return issues;
      }
    }
  }
  if (options.firstStructuralIssueOnly) return issues;
  const visiblePairs = new Set<string>();
  for (const module of normalized) for (const field of SYMMETRIC_RELATION_FIELDS) {
    for (const reference of module[field] ?? []) {
      const target = byCode.get(key(reference));
      if (!target) continue;
      const pair = `${field}:${[key(module.code), key(reference)].sort().join("|")}`;
      if (visiblePairs.has(pair)) continue;
      visiblePairs.add(pair);
      const visible = module.visible !== false;
      const targetVisible = target.visible !== false;
      if (field === "coRequisiteModuleCodes" ? visible !== targetVisible : visible && targetVisible) issues.push({ code: module.code, kind: "visibility",
        message: field === "coRequisiteModuleCodes"
          ? `Co-requisites ${module.code} and ${target.code} must have the same visibility.`
          : `Mutually exclusive modules ${module.code} and ${target.code} cannot both be visible.` });
    }
  }
  return issues;
}

/** Prepare an atomic change; never hide prerequisites of remaining visible modules. */
export function planModuleVisibility<T extends Module>(modules: T[], code: string, visible: boolean): T[] {
  const normalized = normalizeModuleRelationships(modules);
  const invalid = moduleRelationshipIssues(normalized).find((issue) => issue.kind === "structure");
  if (invalid) throw new Error(invalid.message);
  const forced = visible ? moduleVisibilityClosure(normalized, code) : new Map<string, string[]>();
  const hidden = visible ? new Set<string>() : new Set(moduleVisibilityClosure(normalized, code, true).keys());
  if (visible) for (const module of normalized) {
    if (!forced.has(key(module.code))) continue;
    for (const reference of module.mutexModuleCodes ?? []) {
      for (const member of moduleVisibilityClosure(normalized, reference, true).keys()) hidden.add(member);
    }
  }
  for (const module of normalized) {
    if (hidden.has(key(module.code)) || (module.visible === false && !forced.has(key(module.code)))) continue;
    for (const [required, path] of moduleVisibilityClosure(normalized, module.code)) if (hidden.has(required)) {
      throw new Error(`Cannot hide ${required}: ${module.name || module.code} still requires it (${path.join(" → ")}). Hide dependent modules first.`);
    }
  }
  return normalized.map((module) => forced.has(key(module.code)) ? { ...module, visible: true }
    : hidden.has(key(module.code)) ? { ...module, visible: false } : module);
}
