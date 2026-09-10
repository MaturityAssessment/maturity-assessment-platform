import type {
  AssessmentResponse,
  Evidence,
  MaturityModel,
  Question,
  QuestionEvaluationResponse,
} from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import { getFieldName } from "./assessmentFlowUtils.ts";
import {
  buildAssessmentResultMetrics,
  getEffectiveQuestionScore,
} from "./assessmentResults.ts";

export type AssessmentExportAnswer = {
  responseKey: string;
  dimension: string;
  module: string;
  practice: string;
  questionCode: string;
  question: string;
  questionType: string;
  answer: string;
  respondentJustification: string;
  evidence: string;
  initialScore: number | null;
  finalScore: number | null;
  reviewStatus: string;
  evaluatorNote: string;
};

export type AssessmentResultsExportData = {
  assessmentId: number;
  modelName: string;
  modelVersion: number | null;
  domainName: string;
  completedAt: string;
  respondent: string;
  overallMaturityLevel: string;
  overallScore: number;
  scaleMax: number;
  evaluatorInsight: string;
  dimensions: ReturnType<typeof buildAssessmentResultMetrics>["dimensions"];
  scoreDistribution: ReturnType<
    typeof buildAssessmentResultMetrics
  >["scoreDistribution"];
  answers: AssessmentExportAnswer[];
};

export function buildAssessmentResultsExportData(
  assessment: AssessmentResponse,
  model: MaturityModel,
  practiceSteps: AssessmentPracticeStep[]
): AssessmentResultsExportData {
  const metrics = buildAssessmentResultMetrics(assessment, model, practiceSteps);
  const scaleMax = Math.max(
    1,
    model.levels?.reduce(
      (maximum, level) => Math.max(maximum, level.number),
      0
    ) || model.levels?.length || 5
  );
  const evaluations = Object.values(assessment.questionEvaluations || {});
  const evaluationByQuestionId = new Map(
    evaluations.map((evaluation) => [evaluation.questionId, evaluation])
  );
  const evidenceByQuestionId = groupEvidenceByQuestionId(
    assessment.evidence || []
  );

  const answers = practiceSteps.flatMap((step) =>
    step.practice.questions.map<AssessmentExportAnswer>((question) => {
      const responseKey = getFieldName(step, question);
      const evaluation =
        assessment.questionEvaluations?.[responseKey] ||
        (question.id == null
          ? undefined
          : evaluationByQuestionId.get(question.id));
      const evidence =
        question.id == null ? [] : evidenceByQuestionId.get(question.id) || [];

      return {
        responseKey,
        dimension: step.dimension.name,
        module: step.module.name,
        practice: step.practice.name,
        questionCode: question.code?.trim() || String(question.id || ""),
        question: question.text,
        questionType: formatQuestionType(question.type),
        answer: formatQuestionAnswer(question, evaluation, evidence),
        respondentJustification:
          evaluation?.respondentJustification?.trim() || "",
        evidence: formatEvidence(evidence),
        initialScore: finiteNumber(evaluation?.initialScore),
        finalScore: evaluation
          ? finiteNumber(getEffectiveQuestionScore(evaluation))
          : null,
        reviewStatus: formatReviewStatus(evaluation),
        evaluatorNote: evaluation?.reviewerNote?.trim() || "",
      };
    })
  );

  return {
    assessmentId: assessment.id,
    modelName: model.name,
    modelVersion: assessment.maturityModelVersion ?? model.version ?? null,
    domainName: assessment.domainName?.trim() || model.domain?.name?.trim() || "",
    completedAt: assessment.updatedAt || assessment.createdAt,
    respondent: assessment.userEmail?.trim() || "",
    overallMaturityLevel:
      assessment.overallMaturityLevel?.trim() || "Not available",
    overallScore: metrics.overallScore,
    scaleMax,
    evaluatorInsight: assessment.evaluatorInsight?.trim() || "",
    dimensions: metrics.dimensions,
    scoreDistribution: metrics.scoreDistribution,
    answers,
  };
}

export function getAssessmentExportFileName(
  data: Pick<AssessmentResultsExportData, "modelName" | "assessmentId">,
  extension: "pdf" | "xlsx"
) {
  const baseName = data.modelName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "assessment";
  return `${baseName}-assessment-${data.assessmentId}-results.${extension}`;
}

function groupEvidenceByQuestionId(evidenceItems: Evidence[]) {
  const grouped = new Map<number, Evidence[]>();
  evidenceItems.forEach((evidence) => {
    const current = grouped.get(evidence.questionId) || [];
    current.push(evidence);
    grouped.set(evidence.questionId, current);
  });
  return grouped;
}

function formatQuestionAnswer(
  question: Question,
  evaluation: QuestionEvaluationResponse | undefined,
  evidence: Evidence[]
) {
  const value = evaluation?.response;
  if (value === undefined || value === null || value === "") {
    return evidence.length > 0 ? "Evidence submitted" : "Not answered";
  }

  if (question.type === "boolean") {
    if (Number(value) === 1) return "Yes";
    if (Number(value) === 0) return "No";
  }
  if (question.type === "multiple_choice") {
    const numericValue = Number(value);
    const choice = question.choices?.find(
      (candidate) => Math.abs(candidate.score - numericValue) <= 1e-9
    );
    return choice ? choice.label : "Configured option";
  }
  if (question.type === "likert") {
    const point = Number(value);
    const pointCount = question.scalePointCount ?? 5;
    const endpointLabel =
      point === 1
        ? question.scaleMinLabel
        : point === pointCount
          ? question.scaleMaxLabel
          : undefined;
    return `Point ${String(value)} of ${pointCount}${endpointLabel?.trim() ? `: ${endpointLabel}` : ""}`;
  }
  if (question.type === "percentage") {
    return `${String(value)}%`;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatEvidence(evidenceItems: Evidence[]) {
  return evidenceItems
    .map((evidence) => {
      const source =
        evidence.evidenceType === "URL"
          ? evidence.url || "URL evidence"
          : evidence.fileName || "File evidence";
      const description = evidence.description?.trim();
      return description ? `${source} — ${description}` : source;
    })
    .join("\n");
}

function formatReviewStatus(evaluation?: QuestionEvaluationResponse) {
  if (!evaluation?.validationStatus) return "Not reviewed";
  return evaluation.validationStatus.toLowerCase().replace(/_/g, " ");
}

function formatQuestionType(type: Question["type"]) {
  return type.replace(/_/g, " ");
}

function finiteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
