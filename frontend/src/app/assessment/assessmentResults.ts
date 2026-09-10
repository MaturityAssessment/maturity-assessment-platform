import type {
  AssessmentResponse,
  DimensionResultResponse,
  MaturityModel,
  QuestionEvaluationResponse,
} from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import { getFieldName } from "./assessmentFlowUtils.ts";

export type AssessmentDimensionResultMetric = {
  dimensionId: string;
  name: string;
  score: number;
  maturityLevel: string;
  questionCount: number;
  differenceFromOverall: number;
};

export type AssessmentScoreDistributionItem = {
  level: number;
  name: string;
  count: number;
  percentage: number;
};

export type AssessmentAdjustmentMetric = {
  dimensionId: string;
  name: string;
  initialAverage: number;
  finalAverage: number;
  delta: number;
  itemCount: number;
  raisedCount: number;
  loweredCount: number;
};

export type AssessmentEvaluatorNote = {
  responseKey: string;
  dimensionName: string;
  moduleName: string;
  practiceName: string;
  questionText: string;
  status: QuestionEvaluationResponse["validationStatus"];
  note: string;
};

export type AssessmentResultMetrics = {
  overallScore: number;
  finalLevelNumber: number | null;
  dimensions: AssessmentDimensionResultMetric[];
  scoreDistribution: AssessmentScoreDistributionItem[];
  scoredQuestionCount: number;
  dominantLevel: AssessmentScoreDistributionItem | null;
  belowFinalLevelCount: number;
  adjustments: AssessmentAdjustmentMetric[];
  adjustedItemCount: number;
  raisedItemCount: number;
  loweredItemCount: number;
  unchangedAdjustedItemCount: number;
  totalAdjustmentDelta: number;
  evaluatorNotes: AssessmentEvaluatorNote[];
};

type QuestionLocation = {
  dimensionId: string;
  dimensionName: string;
  moduleName: string;
  practiceName: string;
  questionText: string;
  order: number;
};

export function buildAssessmentResultMetrics(
  assessment: AssessmentResponse,
  model: MaturityModel,
  practiceSteps: AssessmentPracticeStep[]
): AssessmentResultMetrics {
  const scaleLevels = [...(model.levels || [])].sort(
    (left, right) => left.number - right.number
  );
  const scaleMax = Math.max(
    1,
    scaleLevels.at(-1)?.number ?? model.levels?.length ?? 5
  );
  const overallScore = finiteNumber(assessment.overallAverage) ?? 0;
  const finalLevelNumber =
    scaleLevels.find(
      (level) =>
        level.name.trim().toLowerCase() ===
        assessment.overallMaturityLevel?.trim().toLowerCase()
    )?.number ?? scoreToLevel(overallScore, scaleMax);
  const locations = buildQuestionLocations(practiceSteps);
  const evaluations = Object.values(assessment.questionEvaluations || {});

  const dimensions = orderDimensionResults(
    assessment.dimensionResults || [],
    model
  ).flatMap((result) => {
    const score = finiteNumber(result.averageScore);
    if (score == null) return [];
    return [
      {
        dimensionId: result.dimensionId,
        name: result.dimensionName,
        score,
        maturityLevel: result.maturityLevel,
        questionCount: result.totalQuestions,
        differenceFromOverall: score - overallScore,
      },
    ];
  });

  const distributionCounts = new Map<number, number>();
  evaluations.forEach((evaluation) => {
    const effectiveScore = getEffectiveQuestionScore(evaluation);
    if (effectiveScore == null) return;
    const level = Math.round(effectiveScore);
    if (level < 1 || level > scaleMax) return;
    distributionCounts.set(level, (distributionCounts.get(level) || 0) + 1);
  });
  const scoredQuestionCount = Array.from(distributionCounts.values()).reduce(
    (sum, count) => sum + count,
    0
  );
  const scoreDistribution = Array.from({ length: scaleMax }, (_, index) => {
    const level = index + 1;
    const count = distributionCounts.get(level) || 0;
    return {
      level,
      name:
        scaleLevels.find((candidate) => candidate.number === level)?.name ||
        `Level ${level}`,
      count,
      percentage:
        scoredQuestionCount > 0 ? (count / scoredQuestionCount) * 100 : 0,
    };
  });
  const dominantLevel =
    scoredQuestionCount > 0
      ? scoreDistribution.reduce((current, candidate) =>
          candidate.count > current.count ? candidate : current
        )
      : null;
  const belowFinalLevelCount = scoreDistribution
    .filter(({ level }) => finalLevelNumber != null && level < finalLevelNumber)
    .reduce((sum, item) => sum + item.count, 0);

  const adjustmentGroups = new Map<
    string,
    {
      name: string;
      initialTotal: number;
      finalTotal: number;
      itemCount: number;
      raisedCount: number;
      loweredCount: number;
    }
  >();
  let adjustedItemCount = 0;
  let raisedItemCount = 0;
  let loweredItemCount = 0;
  let unchangedAdjustedItemCount = 0;
  let totalAdjustmentDelta = 0;

  evaluations.forEach((evaluation) => {
    if (evaluation.validationStatus !== "ADJUSTED") return;
    const initialScore = finiteNumber(evaluation.initialScore);
    const finalScore = finiteNumber(evaluation.manualScore);
    if (initialScore == null || finalScore == null) return;

    const location = locations.get(evaluation.responseKey);
    if (!location) return;
    const delta = finalScore - initialScore;
    const group = adjustmentGroups.get(location.dimensionId) || {
      name: location.dimensionName,
      initialTotal: 0,
      finalTotal: 0,
      itemCount: 0,
      raisedCount: 0,
      loweredCount: 0,
    };
    group.initialTotal += initialScore;
    group.finalTotal += finalScore;
    group.itemCount += 1;
    if (delta > 0) {
      group.raisedCount += 1;
      raisedItemCount += 1;
    } else if (delta < 0) {
      group.loweredCount += 1;
      loweredItemCount += 1;
    } else {
      unchangedAdjustedItemCount += 1;
    }
    adjustmentGroups.set(location.dimensionId, group);
    adjustedItemCount += 1;
    totalAdjustmentDelta += delta;
  });

  const dimensionOrder = new Map(
    model.dimensions.map((dimension, index) => [dimension.id || "", index])
  );
  const adjustments = Array.from(adjustmentGroups.entries())
    .map<AssessmentAdjustmentMetric>(([dimensionId, group]) => ({
      dimensionId,
      name: group.name,
      initialAverage: group.initialTotal / group.itemCount,
      finalAverage: group.finalTotal / group.itemCount,
      delta: (group.finalTotal - group.initialTotal) / group.itemCount,
      itemCount: group.itemCount,
      raisedCount: group.raisedCount,
      loweredCount: group.loweredCount,
    }))
    .sort(
      (left, right) =>
        (dimensionOrder.get(left.dimensionId) ?? Number.MAX_SAFE_INTEGER) -
        (dimensionOrder.get(right.dimensionId) ?? Number.MAX_SAFE_INTEGER)
    );

  const evaluatorNotes = evaluations
    .flatMap((evaluation) => {
      const note = evaluation.reviewerNote?.trim();
      const location = locations.get(evaluation.responseKey);
      if (!note || !location) return [];
      return [
        {
          responseKey: evaluation.responseKey,
          dimensionName: location.dimensionName,
          moduleName: location.moduleName,
          practiceName: location.practiceName,
          questionText: location.questionText,
          status: evaluation.validationStatus,
          note,
          order: location.order,
        },
      ];
    })
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      responseKey: item.responseKey,
      dimensionName: item.dimensionName,
      moduleName: item.moduleName,
      practiceName: item.practiceName,
      questionText: item.questionText,
      status: item.status,
      note: item.note,
    }));

  return {
    overallScore,
    finalLevelNumber,
    dimensions,
    scoreDistribution,
    scoredQuestionCount,
    dominantLevel,
    belowFinalLevelCount,
    adjustments,
    adjustedItemCount,
    raisedItemCount,
    loweredItemCount,
    unchangedAdjustedItemCount,
    totalAdjustmentDelta,
    evaluatorNotes,
  };
}

export function getEffectiveQuestionScore(
  evaluation: QuestionEvaluationResponse
) {
  return (
    finiteNumber(evaluation.manualScore) ??
    finiteNumber(evaluation.initialScore)
  );
}

function buildQuestionLocations(practiceSteps: AssessmentPracticeStep[]) {
  const locations = new Map<string, QuestionLocation>();
  let order = 0;
  practiceSteps.forEach((step) => {
    step.practice.questions.forEach((question) => {
      if (question.id == null) return;
      locations.set(getFieldName(step, question), {
        dimensionId: step.dimension.id || "",
        dimensionName: step.dimension.name,
        moduleName: step.module.name,
        practiceName: step.practice.name,
        questionText: question.text,
        order,
      });
      order += 1;
    });
  });
  return locations;
}

function orderDimensionResults(
  results: DimensionResultResponse[],
  model: MaturityModel
) {
  const resultById = new Map(
    results.map((result) => [result.dimensionId, result])
  );
  const ordered = model.dimensions.flatMap((dimension) => {
    const result = resultById.get(dimension.id || "");
    return result ? [result] : [];
  });
  const included = new Set(ordered.map((result) => result.dimensionId));
  return [
    ...ordered,
    ...results.filter((result) => !included.has(result.dimensionId)),
  ];
}

function scoreToLevel(score: number, scaleMax: number) {
  if (!Number.isFinite(score) || score <= 0) return null;
  return Math.min(scaleMax, Math.max(1, Math.round(score)));
}

function finiteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
