import type {
  AssessmentDetail,
  EvaluationDimension,
  EvaluationModel,
  EvaluationProgress,
  EvaluationQuestion,
  QuestionReviewDraft,
} from "./types";
import type {
  Evidence,
  MaturityLevel,
  MaturityModel,
  Question,
} from "@/api/types";

export function buildResponseKey(
  dimensionId: string | undefined,
  moduleCode: string | undefined,
  practiceId: number | string | undefined,
  questionId: number | undefined
) {
  if (questionId == null) return null;
  return `${dimensionId ?? ""}_${moduleCode ?? ""}_${practiceId ?? ""}_${questionId}`;
}

export function formatResponseValue(value: unknown) {
  if (value === null || value === undefined) return "No response provided.";
  if (typeof value === "string") return value.trim() || "No response provided.";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatQuestionResponseValue(
  question: Question,
  value: unknown,
  _levels: MaturityLevel[] | null | undefined
) {
  if (!isAnswered(value)) {
    return "No response provided.";
  }

  if (question.type === "boolean") {
    if (value === true || value === 1 || value === "1") return "Yes";
    if (value === false || value === 0 || value === "0") return "No";
    return formatResponseValue(value);
  }

  if (question.type === "multiple_choice") {
    const selectedScore = Number(value);
    const choice = question.choices?.find(
      (item) => Math.abs(item.score - selectedScore) <= 1e-9
    );
    if (choice) return choice.label;
    return "Configured option";
  }

  if (question.type === "likert") {
    const selectedPoint = Number(value);
    const pointCount = question.scalePointCount ?? 5;
    const endpointLabel =
      selectedPoint === 1
        ? question.scaleMinLabel
        : selectedPoint === pointCount
          ? question.scaleMaxLabel
          : undefined;
    return `Point ${selectedPoint} of ${pointCount}${endpointLabel?.trim() ? `: ${endpointLabel}` : ""}`;
  }

  if (question.type === "numeric" || question.type === "percentage") {
    const numericValue = Number(value);
    const suffix = question.type === "percentage" ? "%" : "";
    return Number.isFinite(numericValue)
      ? `${numericValue}${suffix}`
      : `${formatResponseValue(value)}${suffix}`;
  }

  return formatResponseValue(value);
}

export function isAnswered(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function buildEvaluationModel(
  assessment: AssessmentDetail,
  maturityModel: MaturityModel | null,
  evidence: Evidence[]
): EvaluationModel {
  const evidenceByQuestion = evidence.reduce<Map<number, Evidence[]>>(
    (acc, item) => {
      const list = acc.get(item.questionId) || [];
      list.push(item);
      acc.set(item.questionId, list);
      return acc;
    },
    new Map<number, Evidence[]>()
  );
  const dimensions: EvaluationDimension[] = [];
  const questions: EvaluationQuestion[] = [];
  const evaluations = assessment.questionEvaluations || {};

  for (const dimension of maturityModel?.dimensions || []) {
    const dimensionId = dimension.id ?? "";
    const groups: EvaluationDimension["groups"] = [];

    for (const maturityModule of dimension.modules || []) {
      const moduleCode = maturityModule.code ?? "";
      for (const practice of maturityModule.practices || []) {
        const practiceId =
          practice.id !== undefined && practice.id !== null
            ? practice.id
            : practice.name;
        const groupQuestions: EvaluationQuestion[] = [];

        for (const question of practice.questions || []) {
          const responseKey = buildResponseKey(
            dimensionId,
            moduleCode,
            practiceId,
            question.id
          );
          if (!responseKey || !question.id) continue;

          const savedEvaluation = evaluations[responseKey];
          const responseValue = savedEvaluation?.response;
          const evidenceItems = evidenceByQuestion.get(question.id) || [];
          const reviewable =
            isAnswered(responseValue) ||
            evidenceItems.length > 0;

          if (!reviewable) continue;

          const row: EvaluationQuestion = {
            responseKey,
            questionId: question.id,
            question,
            dimensionId,
            dimensionName: dimension.name || dimensionId,
            moduleName: maturityModule.name || moduleCode || "Module",
            practiceName: practice.name || "Practice",
            responseValue,
            initialScore: savedEvaluation?.initialScore ?? null,
            evidence: evidenceItems,
            requiresManualScore:
              isAnswered(responseValue) && question.type === "open_answer",
          };
          groupQuestions.push(row);
          questions.push(row);
        }

        if (groupQuestions.length > 0) {
          groups.push({
            moduleName: maturityModule.name || moduleCode || "Module",
            practiceName: practice.name || "Practice",
            questions: groupQuestions,
          });
        }
      }
    }

    if (groups.length > 0) {
      dimensions.push({
        id: dimensionId,
        name: dimension.name || dimensionId,
        description: dimension.description,
        groups,
      });
    }
  }

  return { assessment, maturityModel, evidence, dimensions, questions };
}

export function initialReviewDrafts(
  questions: EvaluationQuestion[],
  assessment: AssessmentDetail
) {
  const drafts: Record<string, QuestionReviewDraft> = {};
  for (const question of questions) {
    const saved = assessment.questionEvaluations?.[question.responseKey];
    drafts[question.responseKey] = {
      validationStatus: saved?.validationStatus ?? undefined,
      manualScore: saved?.manualScore ?? undefined,
      reviewerNote: saved?.reviewerNote || "",
    };
  }
  return drafts;
}

export function calculateProgress(
  questions: EvaluationQuestion[],
  reviews: Record<string, QuestionReviewDraft>
): EvaluationProgress {
  return questions.reduce<EvaluationProgress>(
    (acc, question) => {
      const review = reviews[question.responseKey];
      const status = review?.validationStatus;
      const note = review?.reviewerNote?.trim();
      const needsScore =
        question.requiresManualScore || status === "ADJUSTED";
      const needsNote = status === "ADJUSTED" || status === "FLAGGED";

      acc.total += 1;
      if (status) acc.reviewed += 1;
      else acc.missingStatus += 1;
      if (needsScore && typeof review?.manualScore !== "number") {
        acc.missingManualScores += 1;
      }
      if (needsNote && !note) acc.missingNotes += 1;
      if (status === "FLAGGED") acc.flagged += 1;
      if (status === "ADJUSTED") acc.adjusted += 1;
      return acc;
    },
    {
      total: 0,
      reviewed: 0,
      missingStatus: 0,
      missingManualScores: 0,
      missingNotes: 0,
      flagged: 0,
      adjusted: 0,
    }
  );
}

export function questionTypeLabel(question: Question) {
  return question.type.replace(/_/g, " ");
}
