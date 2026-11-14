import type { NotApplicableAnswer } from "../api/types.ts";

export const NOT_APPLICABLE_ANSWER: NotApplicableAnswer = { notApplicable: true };

export function isNotApplicableAnswer(value: unknown): value is NotApplicableAnswer {
  return typeof value === "object" && value !== null
    && Object.keys(value).length === 1
    && "notApplicable" in value && value.notApplicable === true;
}
