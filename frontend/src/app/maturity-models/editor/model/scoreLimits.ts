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
  if ((owner.scoreLimits?.length ?? 0) > 100) issues.push("At most 100 score limits are supported.");
  owner.scoreLimits?.forEach((limit, index) => {
    if (!limit || !["floor", "ceiling"].includes(limit.kind) || !Number.isFinite(limit.value) || limit.value < 0 || limit.value > 1)
      issues.push(`Score limit ${index + 1}: choose floor/ceiling and a score between 0 and 1.`);
    if (!scoreLimitLinked(limit, owner))
      issues.push(`Score limit ${index + 1}: the linked Flag for Review rule changed or was removed. Relink or remove this limit before saving.`);
  });
  return issues;
}
