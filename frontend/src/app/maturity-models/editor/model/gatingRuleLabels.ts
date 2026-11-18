import type { ChildStateGatingRule, GatingComparison, GatingField, GatingOperator } from "@/api/types";
import type { GatingChildOption } from "./conditionalGating";

export const fieldNames: Record<GatingField, string> = {
  score: "Score", coverage: "Coverage", includedCount: "Included count",
  state: "State", answer: "Answer", answered: "Answer status",
};

export const operatorNames: Record<GatingOperator, string> = {
  "<": "Is below", "<=": "Is at most", "==": "Is equal to", "!=": "Is not equal to",
  ">=": "Is at least", ">": "Is above", is: "Is", isNot: "Is not",
  contains: "Contains", containsAny: "Contains any of", containsAll: "Contains all of",
};

export const stateNames: Record<string, string> = {
  computed: "Score computed", withheld: "Withheld", flagForReview: "Flagged for review",
  unanswered: "Unanswered", unscored: "Awaiting a score",
};

export const quantifierNames = { any: "At least one", every: "Every", no: "None" };

export function quantifierDescription(quantifier: ChildStateGatingRule["quantifier"], childType: string) {
  return {
    any: `At least one ${childType} must match`,
    every: `Every ${childType} must match`,
    no: `None of the ${childType}s may match`,
  }[quantifier];
}

export function emptySelectionDescription(quantifier: ChildStateGatingRule["quantifier"], childType: string) {
  return `If none of the selected ${childType}s are visible, this group ${quantifier === "any" ? "does not match" : "matches"}.`;
}

export function gatingOutcome(effect: ChildStateGatingRule["effect"], owner: string) {
  return effect === "withheld"
    ? `Withhold this ${owner}’s result`
    : `Flag this ${owner} for review`;
}

export function gatingConsequence(effect: ChildStateGatingRule["effect"]) {
  return effect === "withheld"
    ? "The result has no score or maturity level. Its score is excluded from parent aggregation and its contribution to parent completion is zero."
    : "The score and maturity level are kept and contribute normally to parent aggregation. A review flag appears in results and exports.";
}

export function comparisonLabel(comparison: GatingComparison, options: GatingChildOption[]) {
  const { field, operator, right } = comparison;
  const literal = (value: unknown): string => {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return "Enter a value";
      if (field === "score") return `${Number((value * 100).toFixed(8))}%`;
      return field === "coverage" || field === "includedCount" ? `${value}%` : String(value);
    }
    if (typeof value === "boolean") return field === "answered" ? (value ? "Answered" : "Not answered") : (value ? "Yes" : "No");
    if (Array.isArray(value)) return value.length ? value.map(literal).join(", ") : "Choose options";
    if (typeof value === "object" && value && "notApplicable" in value) return "N/A";
    if (typeof value === "string" && field === "state") return stateNames[value] ?? value;
    if (typeof value === "string" && field === "answer") {
      const choice = options.flatMap(option => option.question?.choices ?? []).find(candidate => candidate.id === value);
      return choice?.label ?? JSON.stringify(value);
    }
    return String(value);
  };
  let target: string;
  if (right.kind === "field") {
    const name = options.find(option => option.code === right.code)?.name;
    target = `${fieldNames[right.field].toLowerCase()} of ${name ? `${name} (${right.code})` : right.code}`;
  } else {
    target = literal(right.value);
  }
  return `${fieldNames[field]} ${operatorNames[operator].toLowerCase()} ${target}`;
}
