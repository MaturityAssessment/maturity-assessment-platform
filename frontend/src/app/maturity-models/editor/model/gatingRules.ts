import type { GatingRule } from "@/api/types";

export function hasGatingRuleIssues(
  rules: GatingRule[],
  childCodes: string[]
) {
  const available = new Set(childCodes.map((code) => code.toLowerCase()));
  return rules.some((rule, index) => {
    const normalizedOperands = [rule.threshold, rule.value].every(
      (number) =>
        Number.isFinite(number) &&
        number >= 0 &&
        number <= 1 &&
        Math.abs(number * 100 - Math.round(number * 100)) < 1e-9
    );
    const validChild =
      rule.selection === "specificChild"
        ? Boolean(rule.childCode) &&
          available.has(rule.childCode!.toLowerCase())
        : !rule.childCode;
    return rule.order !== index || !normalizedOperands || !validChild;
  });
}
