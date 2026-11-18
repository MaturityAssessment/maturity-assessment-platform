import type { BranchingExpression, BranchingRule, EvidenceRequirement, Question } from "../api/types.ts";
import { dependencyMatches } from "./questionDependencies.ts";
import { isNotApplicableAnswer } from "./notApplicable.ts";

type UnknownBoolean = boolean | undefined;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function evaluateBranching(expression: BranchingExpression, answer: (code: string) => unknown): UnknownBoolean {
  if (expression.kind === "not") {
    const value = evaluateBranching(expression.condition, answer);
    return value === undefined ? undefined : !value;
  }
  if (expression.kind === "and" || expression.kind === "or") {
    const values = expression.conditions.map(condition => evaluateBranching(condition, answer));
    if (expression.kind === "and") return values.includes(false) ? false : values.includes(undefined) ? undefined : true;
    return values.includes(true) ? true : values.includes(undefined) ? undefined : false;
  }
  if (expression.kind !== "parent") return undefined;
  const value = answer(expression.code);
  if (value === undefined || value === null) return undefined;
  if (expression.predicate.kind === "answered") return true;
  if (Array.isArray(value)) {
    const options = expression.predicate.values.filter(accepted => !isNotApplicableAnswer(accepted));
    return options.length > 0 && options.every(accepted => value.some(selected => equal(selected, accepted)));
  }
  return expression.predicate.values.some(accepted => equal(value, accepted));
}

export function typedBranchingAnswer(question: Question, value: unknown): unknown {
  if (value === undefined || value === null || typeof value === "string" && !value.trim()) return undefined;
  if (isNotApplicableAnswer(value)) return question.allowNotApplicable ? value : undefined;
  switch (question.type) {
    case "boolean": {
      const normalized = String(value).trim().toLowerCase();
      return ["true", "yes", "1", "1.0"].includes(normalized) ? true : ["false", "no", "0", "0.0"].includes(normalized) ? false : undefined;
    }
    case "multiple_choice": {
      let index: number | undefined;
      if (typeof value === "string" && /^choice:\d+$/.test(value)) index = Number(value.slice(7));
      else if (typeof value === "number" || typeof value === "string") {
        const matches = question.choices?.flatMap((choice, i) => Math.abs(choice.score - Number(value)) <= 1e-9 ? [i] : []);
        if (matches?.length === 1) index = matches[0];
      }
      return index === undefined ? undefined : question.choices?.[index]?.id;
    }
    case "multiple_selection": {
      if (!Array.isArray(value) || new Set(value).size !== value.length || !value.every(index => Number.isInteger(index) && Boolean(question.choices?.[index]?.id))) return undefined;
      return value.map(index => question.choices![index].id!);
    }
    case "likert": case "numeric": case "percentage": {
      if (typeof value !== "string" && typeof value !== "number") return undefined;
      const number = Number(value);
      const min = question.type === "likert" ? 1 : question.rangeMin ?? 0;
      const max = question.type === "likert" ? question.scalePointCount ?? 5 : question.rangeMax ?? 100;
      return Number.isInteger(number) && number >= min && number <= max ? number : undefined;
    }
    case "open_answer": return ["string", "number", "boolean"].includes(typeof value) ? String(value) : undefined;
  }
}

export function resolveQuestionVisibility(questions: Question[], response: (question: Question) => unknown) {
  const byCode = new Map(questions.map(question => [question.code?.toLowerCase(), question]));
  const memo = new Map<Question, boolean>(), visiting = new Set<Question>();
  const active = (question: Question): boolean => {
    if (memo.has(question)) return memo.get(question)!;
    if (visiting.has(question)) return false;
    visiting.add(question);
    let visible: boolean;
    if (question.branchingRule) visible = evaluateBranching(question.branchingRule.when, code => {
      const parent = byCode.get(code.toLowerCase());
      return parent && active(parent) ? typedBranchingAnswer(parent, response(parent)) : undefined;
    }) === true;
    else if (question.dependsOnQuestionId != null || question.dependsOnQuestionCode) {
      const parent = questions.find(candidate => candidate.id != null && candidate.id === question.dependsOnQuestionId)
        ?? byCode.get(question.dependsOnQuestionCode?.toLowerCase());
      visible = Boolean(parent && active(parent) && dependencyMatches(parent, question.dependencyCondition, response(parent)));
    } else visible = !question.dependencyCondition;
    visiting.delete(question); memo.set(question, visible);
    return visible;
  };
  questions.forEach(active);
  return memo;
}

export function evidenceIndicatorActive(requirement: EvidenceRequirement, questions: Question[], visible: (question: Question) => boolean) {
  return questions.some(question => visible(question) && (requirement.questionCodes == null
    || requirement.questionCodes.some(code => code.toLowerCase() === question.code?.toLowerCase())));
}

export function mapBranchingReferences(rule: BranchingRule, reference: (code: string) => string): BranchingRule {
  const map = (expression: BranchingExpression): BranchingExpression => expression.kind === "parent"
    ? { ...expression, code: reference(expression.code) }
    : expression.kind === "not" ? { ...expression, condition: map(expression.condition) }
      : { ...expression, conditions: expression.conditions.map(map) };
  return { ...rule, when: map(rule.when) };
}

/** Local code changes follow stable editor identities, including deletions and prefix swaps. */
export function rewritePracticeBranchingReferences<T extends { questions: Array<Question & { clientKey: string }>; evidenceRequirements?: EvidenceRequirement[] }>(before: T, after: T): T {
  const previous = new Map(before.questions.map(q => [q.code?.toLowerCase(), q.clientKey]));
  const current = new Map(after.questions.map(q => [q.clientKey, q.code!]));
  const reference = (code: string) => {
    const identity = previous.get(code.toLowerCase());
    return identity ? current.get(identity) ?? `missing:${identity}` : code;
  };
  return { ...after,
    questions: after.questions.map(q => ({ ...q, ...(q.branchingRule && { branchingRule: mapBranchingReferences(q.branchingRule, reference) }) })),
    ...(after.evidenceRequirements && { evidenceRequirements: after.evidenceRequirements.map(r => ({ ...r, ...(r.questionCodes && { questionCodes: r.questionCodes.map(reference) }) })) }),
  };
}

export function branchingIssues(questions: Question[], requirements: EvidenceRequirement[] = []): string[] {
  const byCode = new Map(questions.map(q => [q.code?.toLowerCase(), q])), edges = new Map<string, string[]>();
  const errors: string[] = [];
  const fail = (message: string): never => { throw Error(message); };
  const shape = (node: object, fields: string[]) => {
    if (!node || Array.isArray(node) || Object.keys(node).length !== fields.length || fields.some(field => !(field in node))) fail("Invalid branching expression.");
  };
  for (const question of questions) {
    const parents: string[] = [];
    try {
      let count = 0;
      const walk = (node: BranchingExpression, depth: number) => {
        if (!node || depth > 20 || ++count > 200) fail("Branching supports at most 200 nodes and depth 20.");
        if (node.kind === "parent") {
          shape(node, ["kind", "code", "predicate"]);
          if (typeof node.code !== "string") fail("Parent code must be text.");
          const code = node.code.toLowerCase(), parent = byCode.get(code);
          if (!parent || parents.includes(code) || parent === question) fail("Parents must be distinct other questions in the same practice.");
          parents.push(code);
          if (node.predicate.kind === "answered") shape(node.predicate, ["kind"]);
          else if (node.predicate.kind === "in") {
            shape(node.predicate, ["kind", "values"]);
            const values = node.predicate.values;
            if (!Array.isArray(values) || !values.length || values.length > 1000 || new Set(values.map(value => JSON.stringify(value))).size !== values.length) fail("Use distinct accepted values.");
            for (const value of values) {
              if (isNotApplicableAnswer(value)) { if (!parent!.allowNotApplicable) fail("N/A must be enabled on the parent."); }
              else if (["multiple_choice", "multiple_selection"].includes(parent!.type)) {
                if (typeof value !== "string" || !parent!.choices?.some(choice => choice.id === value)) fail("Select existing option IDs.");
              } else if (parent!.type === "open_answer") {
                if (typeof value !== "string" || !value.trim() || value.length > 10000) fail("Use nonempty accepted text.");
              } else if (parent!.type === "boolean") { if (typeof value !== "boolean") fail("Use boolean accepted answers."); }
              else if (typeof value !== "number" || typedBranchingAnswer(parent!, value) === undefined) fail("Use an integer within the parent's range.");
            }
          } else fail("Use answered or in predicates.");
        } else if (node.kind === "not") { shape(node, ["kind", "condition"]); walk(node.condition, depth + 1); }
        else if (node.kind === "and" || node.kind === "or") {
          shape(node, ["kind", "conditions"]);
          if (!Array.isArray(node.conditions) || !node.conditions.length || node.conditions.length > 100) fail("Use 1–100 conditions.");
          node.conditions.forEach(child => walk(child, depth + 1));
        } else fail("Unsupported branching condition.");
      };
      if (question.branchingRule) {
        shape(question.branchingRule, ["version", "when"]);
        if (question.branchingRule.version !== 1 || question.dependsOnQuestionCode || question.dependsOnQuestionId != null || question.dependencyCondition) fail("Use branching version 1 without a legacy dependency.");
        walk(question.branchingRule.when, 0);
      } else {
        const parent = question.dependsOnQuestionCode ?? questions.find(q => q.id != null && q.id === question.dependsOnQuestionId)?.code;
        if (parent) parents.push(parent.toLowerCase());
      }
      if (question.hiddenScore != null && (!parents.length || !Number.isFinite(question.hiddenScore) || question.hiddenScore < 0 || question.hiddenScore > 1)) fail("Hidden scores require a dependency and a value from 0 to 1.");
    } catch (error) { errors.push(`${question.code}: ${error instanceof Error ? error.message : "Invalid branching"}`); }
    edges.set(question.code?.toLowerCase() ?? "", parents);
  }
  const done = new Set<string>(), visiting = new Set<string>();
  const visit = (code: string) => {
    if (done.has(code)) return;
    if (visiting.has(code)) { errors.push("Question branching and dependencies cannot contain cycles."); return; }
    visiting.add(code); (edges.get(code) ?? []).forEach(visit); visiting.delete(code); done.add(code);
  };
  edges.forEach((_, code) => visit(code));
  for (const requirement of requirements) if (requirement.questionCodes != null && (!requirement.questionCodes.length
    || requirement.questionCodes.length > 1000 || new Set(requirement.questionCodes.map(code => code.toLowerCase())).size !== requirement.questionCodes.length
    || requirement.questionCodes.some(code => !byCode.has(code.toLowerCase())))) errors.push("Evidence groups require distinct existing questions in this practice.");
  return errors;
}
