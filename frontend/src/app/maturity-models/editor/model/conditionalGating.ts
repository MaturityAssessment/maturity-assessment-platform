import type { ConditionalGatingRule, MaturityModelEditorDocument, ModelEditorDimension, ModelEditorModule, ModelEditorPractice, ModelEditorQuestion } from "@/api/types";

type Item = ModelEditorDimension | ModelEditorModule | ModelEditorPractice | ModelEditorQuestion;
export type GatingChildOption = { code: string; name: string; question?: ModelEditorQuestion };
export const itemChildren = (item: Item): Item[] => "modules" in item ? item.modules : "practices" in item ? item.practices : "questions" in item ? item.questions : [];
export function gatingIndex(document: MaturityModelEditorDocument) {
  const byCode = new Map<string, Item>(), byKey = new Map<string, string>();
  const visit = (items: Item[], parent: string) => items.forEach(item => {
    const path = parent ? `${parent}.${item.code}` : item.code;
    byCode.set(path, item); byKey.set(item.clientKey, path); visit(itemChildren(item), path);
  });
  visit(document.dimensions, ""); return { byCode, byKey };
}
export function gatingChildren(document: MaturityModelEditorDocument, ownerKey: string): GatingChildOption[] {
  const { byCode, byKey } = gatingIndex(document), path = byKey.get(ownerKey);
  const owner = path ? byCode.get(path) : undefined;
  return owner ? itemChildren(owner).map(item => ({ code: `${path}.${item.code}`, name: "text" in item ? item.text : item.name, ...("type" in item ? { question: item } : {}) })) : [];
}
export function mapGatingReferences(rules: ConditionalGatingRule[], resolve: (code: string) => string): ConditionalGatingRule[] {
  return rules.map(rule => ({ ...rule, when: { ...rule.when, conditions: rule.when.conditions.map(clause => ({ ...clause,
    selection: clause.selection.codes ? { codes: clause.selection.codes.map(resolve) } : {},
    where: { ...clause.where, conditions: clause.where.conditions.map(comparison => ({ ...comparison, right: comparison.right.kind === "field" ? { ...comparison.right, code: resolve(comparison.right.code) } : comparison.right })) },
  })) } }));
}
/** Rewrite simultaneous renames by editor identity. Deletions stay invalid rather than targeting the item that inherited their code. */
export function repairConditionalReferences(before: MaturityModelEditorDocument, after: MaturityModelEditorDocument): MaturityModelEditorDocument {
  const previous = gatingIndex(before), next = gatingIndex(after);
  const rename = (code: string) => {
    const item = previous.byCode.get(code);
    return item ? next.byKey.get(item.clientKey) ?? `missing:${code}` : code;
  };
  const oldByKey = new Map([...previous.byCode.values()].map(item => [item.clientKey, item]));
  const visit = (item: Item): Item => {
    let result = item;
    if ("conditionalGatingRules" in item && item.conditionalGatingRules?.length) {
      const old = oldByKey.get(item.clientKey);
      // Explicit rule edits/imports are already expressed in the new document's identifiers.
      if (old && "conditionalGatingRules" in old && JSON.stringify(old.conditionalGatingRules) === JSON.stringify(item.conditionalGatingRules)) {
        const rules = mapGatingReferences(item.conditionalGatingRules, rename);
        if (JSON.stringify(rules) !== JSON.stringify(item.conditionalGatingRules)) result = { ...item, conditionalGatingRules: rules };
      }
    }
    const children = itemChildren(result), nested = children.map(visit);
    if (nested.every((child, index) => child === children[index])) return result;
    return "modules" in result ? { ...result, modules: nested as ModelEditorModule[] } : "practices" in result ? { ...result, practices: nested as ModelEditorPractice[] } : "questions" in result ? { ...result, questions: nested as ModelEditorQuestion[] } : result;
  };
  const dimensions = after.dimensions.map(item => visit(item) as ModelEditorDimension);
  return dimensions.every((item, i) => item === after.dimensions[i]) ? after : { ...after, dimensions };
}
export function conditionalGatingIssues(rules: ConditionalGatingRule[] | undefined, children: GatingChildOption[]): string[] {
  const errors: string[] = [], byCode = new Map(children.map(child => [child.code, child]));
  if (!rules?.length) return errors;
  const numeric = ["score", "coverage", "includedCount"], relations = ["<", "<=", "==", "!=", ">=", ">"];
  const fail = (rule: number, message: string) => errors.push(`Conditional rule ${rule + 1}: ${message}`);
  if (rules.length > 100) errors.push("At most 100 conditional rules are supported.");
  rules.forEach((rule, index) => {
    try {
      if (rule.name != null && (!rule.name.trim() || rule.name.length > 255) || rule.description != null && rule.description.length > 2000) throw Error("Use a name of 1–255 characters and a description of at most 2000 characters.");
      if (rule.version !== 1 || !["withheld", "flagForReview"].includes(rule.effect) || rule.when.kind !== "and" || !rule.when.conditions.length || rule.when.conditions.length > 50) throw Error("Use version 1, AND conditions and a valid effect.");
      for (const clause of rule.when.conditions) {
        if (clause.kind !== "children" || !["any", "every", "no"].includes(clause.quantifier) || clause.where.kind !== "and" || !clause.where.conditions.length || clause.where.conditions.length > 50) throw Error("Complete each selection and its AND comparisons.");
        const codes = clause.selection.codes;
        if (codes && (!codes.length || codes.length > 1000 || new Set(codes).size !== codes.length || codes.some(code => !byCode.has(code)))) throw Error("Select distinct, existing direct children using their full identifiers.");
        const selected = codes ? codes.map(code => byCode.get(code)!) : children;
        for (const comparison of clause.where.conditions) {
          if (comparison.kind !== "comparison") throw Error("Invalid comparison.");
          for (const child of selected) {
            const { field, operator: op, right } = comparison;
            if (!(child.question ? ["score", "state", "answer", "answered"] : ["score", "state", "coverage", "includedCount"]).includes(field)) throw Error(`Field ${field} is unavailable on ${child.code}.`);
            if (right.kind === "field") {
              if (!numeric.includes(field) || right.field !== field || !byCode.has(right.code) || (byCode.get(right.code)?.question && field !== "score")) throw Error("Compare the same numeric field on one existing direct child, using its full identifier.");
            } else if (right.kind !== "literal" || right.value == null) throw Error("Choose a literal or field reference.");
            const value = right.kind === "literal" ? right.value : undefined;
            if (numeric.includes(field)) {
              if (!relations.includes(op) || (right.kind === "literal" && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > (field === "score" ? 1 : 100)))) throw Error("Use numeric operators; scores use 0–1, coverage/included count use 0–100.");
            } else if (field === "state") {
              if (!["is", "isNot"].includes(op) || !["computed", "withheld", "flagForReview", ...(child.question ? ["unanswered", "unscored"] : [])].includes(String(value))) throw Error("Choose a valid state and is/is not.");
            } else if (field === "answered") {
              if (!["==", "!="].includes(op) || typeof value !== "boolean") throw Error("Answered requires true/false and equality.");
            } else {
              const q = child.question!;
              const na = typeof value === "object" && !Array.isArray(value) && value?.notApplicable === true;
              if (na) { if (!q.allowNotApplicable || !["==", "!="].includes(op)) throw Error("N/A must be enabled and uses equality."); continue; }
              const option = (id: unknown) => typeof id === "string" && q.choices?.some(choice => choice.id === id);
              if (["numeric", "percentage", "likert"].includes(q.type)) {
                const min = q.type === "likert" ? 1 : q.rangeMin, max = q.type === "likert" ? q.scalePointCount : q.rangeMax;
                if (!relations.includes(op) || typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw Error("Use an integer answer within the selected question's response range.");
              } else if (q.type === "multiple_selection") {
                if (!(op === "contains" ? option(value) : ["containsAny", "containsAll"].includes(op) && Array.isArray(value) && value.length && new Set(value).size === value.length && value.every(option))) throw Error("Use membership operators and stable option IDs.");
              } else if (!["==", "!="].includes(op) || (q.type === "boolean" ? typeof value !== "boolean" : q.type === "multiple_choice" ? !option(value) : typeof value !== "string" || value.length > 10000)) throw Error("Use an answer literal matching the selected question type.");
            }
          }
        }
      }
    } catch (error) { fail(index, error instanceof Error ? error.message : "Invalid condition structure."); }
  });
  return errors;
}

/** Revert temporarily binds full references to stable editor identities before codes can collide. */
export function encodeConditionalReferences(document: MaturityModelEditorDocument) {
  const index = gatingIndex(document);
  for (const item of index.byCode.values()) if ("conditionalGatingRules" in item && item.conditionalGatingRules) {
    item.conditionalGatingRules = mapGatingReferences(item.conditionalGatingRules, code => {
      const target = index.byCode.get(code); return target ? `@gating:${target.clientKey}` : code;
    });
  }
}
export function decodeConditionalReferences(document: MaturityModelEditorDocument) {
  const index = gatingIndex(document);
  for (const item of index.byCode.values()) if ("conditionalGatingRules" in item && item.conditionalGatingRules) {
    item.conditionalGatingRules = mapGatingReferences(item.conditionalGatingRules, code => code.startsWith("@gating:") ? index.byKey.get(code.slice(8)) ?? `missing:${code.slice(8)}` : code);
  }
}
