import type { AssessmentLog, Question } from "@/api/types";

export function describeAssessmentLog(log: AssessmentLog): string {
  const actor = log.actorName?.trim() || log.actorEmail || (log.actorRole === "EVALUATOR" ? "Evaluator" : "Respondent");
  const target = `“${log.targetLabel}”`;
  switch (log.action) {
    case "ASSESSMENT_STATUS_CHANGED": return `${actor} changed the assessment status.`;
    case "ASSESSMENT_CREATED": return `${actor} created the assessment.`;
    case "ASSESSMENT_SUBMITTED": return `${actor} submitted the assessment.`;
    case "ASSESSMENT_RESUBMITTED": return `${actor} resubmitted the assessment after making the requested changes.`;
    case "ASSESSMENT_RESET": return `${actor} reset the draft assessment.`;
    case "REFERENCE_DATE_CHANGED": return `${actor} changed the assessment reference date.`;
    case "ANSWER_ADDED": return `${actor} answered ${target}.`;
    case "ANSWER_CHANGED": return `${actor} changed the answer to ${target}.`;
    case "ANSWER_REMOVED": return `${actor} cleared the answer to ${target}.`;
    case "JUSTIFICATION_CHANGED": return `${actor} changed the justification for ${target}.`;
    case "REVIEW_UPDATE_CONFIRMED": return `${actor} marked the requested changes to ${target} as addressed.`;
    case "QUESTION_REVIEW_CHANGED": return `${actor} updated the review of ${target}.`;
    case "EVALUATOR_REMARKS_CHANGED": return `${actor} changed the overall evaluation remarks.`;
    case "EVALUATION_COMPLETED": return `${actor} completed the evaluation.`;
    case "CHANGES_REQUESTED": return `${actor} returned the assessment for corrections.`;
    case "EVIDENCE_ADDED": return `${actor} added evidence for ${target}.`;
    case "EVIDENCE_CHANGED": return `${actor} updated evidence for ${target}.`;
    case "EVIDENCE_REMOVED": return `${actor} removed evidence from ${target}.`;
    default: return `${actor} updated ${target}.`;
  }
}

function displayAnswer(value: Record<string, unknown>, question?: Question): string {
  if (typeof value.answerLabel === "string") return value.answerLabel;
  const answer = value.response;
  if (question?.type === "boolean") return answer === true || answer === 1 || answer === "1" || answer === "true" ? "Yes" : "No";
  if (question?.type === "multiple_choice") {
    const choice = typeof value.choiceIndex === "number"
      ? question.choices?.[value.choiceIndex]
      : question.choices?.find(option => option.score === Number(answer));
    if (choice) return choice.label;
  }
  if (question?.type === "multiple_selection" && Array.isArray(answer)) {
    return answer.map(index => question.choices?.[Number(index)]?.label || String(index)).join(", ") || "None selected";
  }
  if (question?.type === "percentage") return `${answer}%`;
  return Array.isArray(answer) ? answer.join(", ") : String(answer ?? "No answer");
}

/** Display saved values without exposing the audit storage schema in the UI. */
export function formatLogValue(log: AssessmentLog, value: unknown, question?: Question): string {
  if (value == null) return "None";
  if (log.action === "EVALUATOR_REMARKS_CHANGED") return String(value);
  if (log.action === "QUESTION_REVIEW_CHANGED" && typeof value === "object") {
    const review = value as Record<string, unknown>;
    const labels: Record<string, string> = { ACCEPTED: "Accepted", ADJUSTED: "Adjusted", FLAGGED: "Changes requested" };
    return [
      `Review: ${labels[String(review.validationStatus)] || "Not reviewed"}`,
      review.manualScore == null ? "No manual score" : `Manual score: ${review.manualScore}`,
      review.reviewerNote ? `Reviewer note: ${review.reviewerNote}` : "No reviewer note",
      review.respondentUpdated ? "Respondent marked correction as addressed" : null,
    ].filter(Boolean).join("\n");
  }
  if (log.action === "REVIEW_UPDATE_CONFIRMED") return value ? "Marked as addressed" : "Awaiting respondent update";
  if (log.targetType === "QUESTION" && typeof value === "object") {
    const response = value as Record<string, unknown>;
    const answer = displayAnswer(response, question);
    return response.justification ? `${answer}\nJustification: ${response.justification}` : answer;
  }
  if (log.targetType === "EVIDENCE" && typeof value === "object") {
    const evidence = value as Record<string, unknown>;
    return [
      evidence.type === "FILE" ? "File evidence" : evidence.type === "URL" ? "Link evidence" : "Text evidence",
      evidence.fileName,
      evidence.url,
      evidence.description,
      evidence.collectedAt && `Collected on: ${evidence.collectedAt}`,
      (evidence.requirementLabel || evidence.requirementCode) && `Requirement: ${evidence.requirementLabel || evidence.requirementCode}`,
      Array.isArray(evidence.referencedQuestions) && evidence.referencedQuestions.length > 0
        ? `Referenced questions: ${evidence.referencedQuestions.join(", ")}` : null,
    ].filter(Boolean).join("\n");
  }
  const statusLabels: Record<string, string> = {
    DRAFT: "Draft", PENDING_REVIEW: "Pending review", CHANGES_REQUESTED: "Changes requested", COMPLETED: "Completed",
  };
  if (typeof value === "string") return statusLabels[value] || value;
  if (typeof value === "object") {
    const state = value as Record<string, unknown>;
    return [state.status && (statusLabels[String(state.status)] || String(state.status)),
      state.referenceDate && `Reference date: ${state.referenceDate}`,
      state.overallPercentageScore != null && `Overall score: ${state.overallPercentageScore}%`,
      state.overallMaturityLevel && `Maturity level: ${state.overallMaturityLevel}`].filter(Boolean).join("\n");
  }
  return String(value);
}

export function assessmentLogAction(action: string): string {
  const labels: Record<string, string> = {
    ASSESSMENT_STATUS_CHANGED: "Status changed",
    QUESTION_REVIEW_CHANGED: "Question review updated", EVALUATOR_REMARKS_CHANGED: "Evaluation remarks changed",
    EVALUATION_COMPLETED: "Evaluation completed", CHANGES_REQUESTED: "Corrections requested",
    ASSESSMENT_CREATED: "Assessment created", ASSESSMENT_SUBMITTED: "Assessment submitted",
    ASSESSMENT_RESUBMITTED: "Assessment resubmitted", ASSESSMENT_RESET: "Draft reset",
    REFERENCE_DATE_CHANGED: "Reference date changed", ANSWER_ADDED: "Answer added",
    ANSWER_CHANGED: "Answer changed", ANSWER_REMOVED: "Answer cleared",
    JUSTIFICATION_CHANGED: "Justification changed", REVIEW_UPDATE_CONFIRMED: "Correction marked as addressed",
    EVIDENCE_ADDED: "Evidence added", EVIDENCE_CHANGED: "Evidence updated", EVIDENCE_REMOVED: "Evidence removed",
  };
  return labels[action] || "Item updated";
}

export type LogQuestion = { question: Question; code: string };

export function buildLogQuestions(model: import("@/api/types").MaturityModel | null): Map<number, LogQuestion> {
  const questions = new Map<number, LogQuestion>();
  model?.dimensions.forEach((dimension, di) => dimension.modules.forEach((module, mi) =>
    module.practices.forEach((practice, pi) => practice.questions.forEach((question, qi) => {
      if (question.id == null) return;
      questions.set(question.id, { question, code: [dimension.id || `D${di + 1}`, module.code || `M${mi + 1}`,
        practice.code || `P${pi + 1}`, question.code || `Q${qi + 1}`].join(" / ") });
    }))));
  return questions;
}

export function assessmentLogTarget(log: AssessmentLog, questions: Map<number, LogQuestion>): string {
  if (log.targetType === "QUESTION") return questions.get(log.targetId)?.code || log.targetLabel.split(" — ")[0];
  return log.targetType === "EVIDENCE" ? "Evidence" : "Assessment";
}

export type LogFilters = { dimensionId: string; moduleCode: string; practiceId: string; questionId: string };
export const emptyLogFilters: LogFilters = { dimensionId: "", moduleCode: "", practiceId: "", questionId: "" };

export function changeLogFilter(current: LogFilters, level: keyof LogFilters, value: string): LogFilters {
  const levels: (keyof LogFilters)[] = ["dimensionId", "moduleCode", "practiceId", "questionId"];
  const next = { ...current, [level]: value };
  for (const child of levels.slice(levels.indexOf(level) + 1)) next[child] = "";
  return next;
}

export function logFilterOptions(model: import("@/api/types").MaturityModel | null, filters: LogFilters) {
  const dimensions = model?.dimensions || [];
  const modules = dimensions.find(item => item.id === filters.dimensionId)?.modules || [];
  const practices = modules.find(item => item.code === filters.moduleCode)?.practices || [];
  const questions = practices.find(item => String(item.id) === filters.practiceId)?.questions || [];
  return { dimensions, modules, practices, questions };
}

/** Resolve the complete hierarchy so a row shortcut also updates every parent selector. */
export function logEntryFilters(log: AssessmentLog, model: import("@/api/types").MaturityModel | null): LogFilters | null {
  if (log.targetType !== "QUESTION" && log.targetType !== "EVIDENCE") return null;
  const practiceIds = [log.afterValue, log.beforeValue].flatMap(value => {
    if (!value || typeof value !== "object" || !("practiceId" in value)) return [];
    const id = Number(value.practiceId);
    return Number.isSafeInteger(id) && id > 0 ? [id] : [];
  });
  const evidencePracticeId = practiceIds.find(id => model?.dimensions.some(d =>
    d.modules.some(m => m.practices.some(p => p.id === id))));
  for (const dimension of model?.dimensions || []) {
    for (const module of dimension.modules) {
      for (const practice of module.practices) {
        if (!dimension.id || !module.code || practice.id == null) continue;
        const question = log.targetType === "QUESTION" ? practice.questions.find(q => q.id === log.targetId) : undefined;
        if (question || (log.targetType === "EVIDENCE" && evidencePracticeId === practice.id)) {
          return { dimensionId: dimension.id, moduleCode: module.code, practiceId: String(practice.id),
            questionId: question ? String(question.id) : "" };
        }
      }
    }
  }
  return null;
}

export const logActivityViews = [
  { value: "ALL", label: "All activity" }, { value: "LIFECYCLE", label: "Lifecycle" },
  { value: "RESPONDENT", label: "Respondent changes" }, { value: "EVALUATOR", label: "Evaluator changes" },
  { value: "EVIDENCE", label: "Evidence" },
] as const;
export type LogActivityView = typeof logActivityViews[number]["value"];
const lifecycleActions = new Set(["ASSESSMENT_CREATED", "ASSESSMENT_SUBMITTED", "ASSESSMENT_RESUBMITTED",
  "ASSESSMENT_RESET", "EVALUATION_COMPLETED", "CHANGES_REQUESTED", "ASSESSMENT_STATUS_CHANGED"]);
export function isLifecycleLog(log: AssessmentLog): boolean { return lifecycleActions.has(log.action); }

export function logStatusTransition(log: AssessmentLog): string {
  const labels: Record<string, string> = { DRAFT: "Draft", PENDING_REVIEW: "Pending review", COMPLETED: "Completed", CHANGES_REQUESTED: "Changes requested" };
  const status = (value: unknown): string => {
    const code = typeof value === "string" ? value : value && typeof value === "object" && "status" in value ? String(value.status) : "";
    return labels[code] || code;
  };
  const before = status(log.beforeValue), after = status(log.afterValue);
  if (log.action === "ASSESSMENT_CREATED") return after ? `Created · ${after}` : "Created";
  return before && after && before !== after ? `${before} → ${after}` : after || before || "Lifecycle";
}
