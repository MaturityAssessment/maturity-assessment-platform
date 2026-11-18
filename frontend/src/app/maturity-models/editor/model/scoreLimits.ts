import type { ChildStateGatingRule, ConditionalGatingRule, ScoreLimit } from "@/api/types";

export type LimitOwner = {
  scoreLimits?: ScoreLimit[];
  childStateGatingRules?: ChildStateGatingRule[];
  conditionalGatingRules?: ConditionalGatingRule[];
};

// Compare JSON content independent of object key order and nullable optional metadata.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v != null)
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function scoreLimitLinked(limit: ScoreLimit, owner: LimitOwner): boolean {
  if (!limit || !!limit.childStateRule === !!limit.conditionalRule) return false;
  const rule = limit.childStateRule ?? limit.conditionalRule;
  const rules = limit.childStateRule ? owner.childStateGatingRules : owner.conditionalGatingRules;
  return rule?.effect === "flagForReview" && !!rules?.some(candidate => canonical(candidate) === canonical(rule));
}

export function scoreLimitIssues(owner: LimitOwner): string[] {
  const issues: string[] = [];
  const usedGates = new Set<string>();
  if ((owner.scoreLimits?.length ?? 0) > 100) issues.push("At most 100 score limits are supported.");
  owner.scoreLimits?.forEach((limit, index) => {
    if (!limit || !["floor", "ceiling", "both"].includes(limit.kind) || !Number.isFinite(limit.value) || limit.value < 0 || limit.value > 1)
      issues.push(`Score limit ${index + 1}: choose Floor, Ceiling or Both and a value between 0 and 1.`);
    if (limit?.kind === "both" && (typeof limit.upperValue !== "number" || !Number.isFinite(limit.upperValue) || limit.upperValue < 0 || limit.upperValue > 1 || limit.upperValue < limit.value))
      issues.push(`Score limit ${index + 1}: the ceiling must be between the floor and 1.`);
    if (limit && limit.kind !== "both" && limit.upperValue != null)
      issues.push(`Score limit ${index + 1}: select Both to set a floor and a ceiling.`);
    if (!scoreLimitLinked(limit, owner))
      issues.push(`Score limit ${index + 1}: the linked Flag for Review rule changed or was removed. Relink or remove this limit before saving.`);
    if (limit && (!!limit.childStateRule !== !!limit.conditionalRule)) {
      const gate = canonical([limit.childStateRule ? "state" : "conditional", limit.childStateRule ?? limit.conditionalRule]);
      if (usedGates.has(gate)) issues.push(`Score limit ${index + 1}: this Flag for Review gate already has a limit. Choose another gate or remove this limit.`);
      usedGates.add(gate);
    }
  });
  return issues;
}
