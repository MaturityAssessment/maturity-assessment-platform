import type { DependencyCondition, Question } from "../api/types.ts";

type Parent = Pick<Question, "type" | "choices" | "scalePointCount">;

export function defaultDependencyCondition(type: Question["type"]): DependencyCondition | undefined {
  if (type === "boolean") return { type, answers: [true] };
  if (type === "multiple_choice") return { type, optionIds: [] };
  if (type === "likert") return { type, points: [] };
}

export function dependencyConditionError(parent: Parent | undefined, condition: DependencyCondition | null | undefined) {
  if (!parent) return condition ? "Select a parent question for these activation answers." : undefined;
  condition ??= parent.type === "boolean" ? { type: "boolean", answers: [true] } : undefined;
  if (!condition || condition.type !== parent.type) return "Select activation answers for the parent question's current type.";
  let values: unknown[];
  if (condition.type === "boolean") values = condition.answers;
  else if (condition.type === "multiple_choice") values = condition.optionIds;
  else values = condition.points;
  if (!Array.isArray(values) || !values.length) return "Select at least one answer that activates this question.";
  if (new Set(values).size !== values.length) return "Activation answers must be unique.";
  const valid = condition.type === "boolean"
    ? values.every((value) => typeof value === "boolean")
    : condition.type === "multiple_choice"
      ? values.every((value) => typeof value === "string" && parent.choices?.some((choice) => choice.id === value))
      : values.every((value) => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= (parent.scalePointCount ?? 5));
  return valid ? undefined : "An activation answer is no longer available. Update the dependency.";
}

export function dependencyMatches(parent: Parent, condition: DependencyCondition | null | undefined, value: unknown) {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return false;
  if (!["number", "string", "boolean"].includes(typeof value)) return false;
  if (dependencyConditionError(parent, condition)) return false;
  condition ??= { type: "boolean", answers: [true] };
  if (condition.type === "boolean") {
    const normalized = String(value).toLowerCase();
    const answer = ["true", "yes", "1", "1.0"].includes(normalized) ? true
      : ["false", "no", "0", "0.0"].includes(normalized) ? false : undefined;
    return answer !== undefined && condition.answers.includes(answer);
  }
  if (condition.type === "likert") {
    const point = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
    return Number.isInteger(point) && condition.points.includes(point);
  }
  let index: number | undefined;
  if (typeof value === "string" && /^choice:\d+$/.test(value)) index = Number(value.slice(7));
  else if (typeof value === "number" || typeof value === "string") {
    const score = Number(value);
    const matches = parent.choices?.flatMap((choice, i) => Math.abs(choice.score - score) <= 1e-9 ? [i] : []);
    if (matches?.length === 1) index = matches[0];
  }
  const option = index === undefined ? undefined : parent.choices?.[index];
  return Boolean(option?.id && condition.optionIds.includes(option.id));
}

export function dependencySummary(parent: (Parent & { code?: string }) | undefined, condition: DependencyCondition | null | undefined) {
  if (!parent) return "Dependency needs attention";
  if (dependencyConditionError(parent, condition)) return `Update activation answers for ${parent.code || "the related question"}`;
  condition ??= { type: "boolean", answers: [true] };
  const labels = condition.type === "boolean" ? condition.answers.map((answer) => answer ? "Yes" : "No")
    : condition.type === "likert" ? condition.points.map(String)
      : condition.optionIds.map((id) => parent.choices?.find((choice) => choice.id === id)?.label || "Untitled option");
  return `Active when ${parent.code || "the related question"} is answered ${labels.join(" or ")}`;
}

export function isDependencyParent(parent: Pick<Question, "id" | "code">, child: Pick<Question, "dependsOnQuestionId" | "dependsOnQuestionCode">) {
  return (child.dependsOnQuestionId != null && parent.id === child.dependsOnQuestionId)
    || Boolean(child.dependsOnQuestionCode && parent.code?.toLowerCase() === child.dependsOnQuestionCode.toLowerCase());
}
