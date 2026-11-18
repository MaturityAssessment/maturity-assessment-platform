import type { BranchingExpression, ModelEditorQuestion, Question } from "../../../../api/types.ts";

export type AcceptedValue = string | number | boolean | { notApplicable: true };

/** Read legacy dependencies without silently rewriting saved drafts. */
export function editableBranching(question: Question, questions: Question[]): BranchingExpression | undefined {
  if (question.branchingRule) return question.branchingRule.when;
  const code = question.dependsOnQuestionCode ?? questions.find(q => q.id != null && q.id === question.dependsOnQuestionId)?.code;
  if (!code) return undefined;
  const parent = questions.find(q => q.code?.toLowerCase() === code.toLowerCase());
  const condition = question.dependencyCondition;
  const values = condition?.type === "boolean" ? condition.answers
    : condition?.type === "multiple_choice" ? condition.optionIds
      : condition?.type === "likert" ? condition.points : parent?.type === "boolean" ? [true] : [];
  return { kind: "parent", code, predicate: { kind: "in", values } };
}

export function parentCodes(expression?: BranchingExpression): string[] {
  if (!expression) return [];
  if (expression.kind === "parent") return [expression.code];
  if (expression.kind === "not") return parentCodes(expression.condition);
  return expression.conditions.flatMap(parentCodes);
}

export function branchingWouldCycle(questions: Question[], questionCode: string, candidateCode: string): boolean {
  const byCode = new Map(questions.map(q => [q.code?.toLowerCase(), q]));
  const visited = new Set<string>(), visiting = new Set<string>();
  const visit = (code: string): boolean => {
    code = code.toLowerCase();
    if (code === questionCode.toLowerCase() || visiting.has(code)) return true;
    if (visited.has(code)) return false;
    visiting.add(code);
    const question = byCode.get(code);
    const cycle = question ? parentCodes(editableBranching(question, questions)).some(visit) : false;
    visiting.delete(code); visited.add(code);
    return cycle;
  };
  return visit(candidateCode);
}

export function setQuestionBranching(question: ModelEditorQuestion, when?: BranchingExpression): ModelEditorQuestion {
  return { ...question, dependsOnQuestionCode: undefined, dependencyCondition: undefined,
    branchingRule: when ? { version: 1, when } : undefined, hiddenScore: when ? question.hiddenScore : undefined };
}

export function acceptedValueLabel(value: AcceptedValue, parent?: Question): string {
  if (typeof value === "object") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (parent?.type === "multiple_choice" || parent?.type === "multiple_selection") {
    return parent.choices?.find(choice => choice.id === value)?.label || `Missing option (${value})`;
  }
  return String(value);
}

export function branchingSummary(expression: BranchingExpression | undefined, questions: Question[]): string {
  if (!expression) return "Always visible";
  if (expression.kind === "not") return `Not (${branchingSummary(expression.condition, questions)})`;
  if (expression.kind === "and" || expression.kind === "or") {
    return `(${expression.conditions.map(condition => branchingSummary(condition, questions)).join(expression.kind === "and" ? " AND " : " OR ")})`;
  }
  if (expression.kind !== "parent") return "Invalid rule";
  if (expression.predicate.kind === "answered") return `${expression.code} has an answer`;
  const parent = questions.find(q => q.code?.toLowerCase() === expression.code.toLowerCase());
  if (parent?.type === "multiple_selection") {
    const options = expression.predicate.values.filter(value => typeof value !== "object").map(value => acceptedValueLabel(value, parent));
    const acceptsNA = expression.predicate.values.some(value => typeof value === "object");
    const optionSummary = `${expression.code} includes all of [${options.join(", ")}]`;
    return options.length ? acceptsNA ? `(${optionSummary} OR ${expression.code} is N/A)` : optionSummary
      : `${expression.code} ${acceptsNA ? "is N/A" : "[choose answers]"}`;
  }
  const labels = expression.predicate.values.map(value => acceptedValueLabel(value, parent));
  return `${expression.code} is ${labels.join(" / ") || "[choose answers]"}`;
}

/** Topological columns for the preview; invalid cycles remain inspectable. */
export function dependencyColumns(questions: ModelEditorQuestion[]): ModelEditorQuestion[][] {
  const remaining = new Set(questions), placed = new Set<string>(), columns: ModelEditorQuestion[][] = [];
  const existing = new Set(questions.map(q => q.code.toLowerCase()));
  while (remaining.size) {
    const column = [...remaining].filter(q => parentCodes(editableBranching(q, questions))
      .every(code => !existing.has(code.toLowerCase()) || placed.has(code.toLowerCase())));
    if (!column.length) { columns.push([...remaining]); break; }
    columns.push(column);
    column.forEach(q => { remaining.delete(q); placed.add(q.code.toLowerCase()); });
  }
  return columns;
}
