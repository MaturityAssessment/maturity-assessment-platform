import type { Question } from "@/api/types";

// Keep option identity in form state; scores remain the API's response value.
export function singleChoiceValue(index: number) {
  return `choice:${index}`;
}

export function getSingleChoiceIndex(question: Question, value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && value.startsWith("choice:")) {
    const index = Number(value.slice(7));
    return Number.isInteger(index) && index >= 0 && index < (question.choices?.length ?? 0)
      ? index : undefined;
  }
  // Legacy answers stored only a score. Pick the first match deterministically.
  const index = question.choices?.findIndex((choice) => Math.abs(choice.score - Number(value)) <= 1e-9);
  return index !== undefined && index >= 0 ? index : undefined;
}

export function isAmbiguousChoiceResponse(question: Question, value: unknown) {
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || String(value).startsWith("choice:")) return false;
  return (question.choices?.filter((choice) => Math.abs(choice.score - Number(value)) <= 1e-9).length ?? 0) > 1;
}
