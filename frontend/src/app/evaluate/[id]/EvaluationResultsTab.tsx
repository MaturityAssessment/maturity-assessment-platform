"use client";

import { AlertTriangle, CheckCircle2, PencilLine } from "lucide-react";
import { TEXT_LIMITS } from "@/config/textLimits";
import { formatLevelWithNumber, formatScore1ToN } from "@/lib/maturityFormat";
import type { MaturityModel } from "@/api/types";
import type {
  AssessmentDetail,
  EvaluationProgress,
  EvaluationQuestion,
  QuestionReviewDraft,
} from "./types";

interface EvaluationResultsTabProps {
  assessment: AssessmentDetail;
  maturityModel: MaturityModel | null;
  questions: EvaluationQuestion[];
  reviews: Record<string, QuestionReviewDraft>;
  progress: EvaluationProgress;
  finalRemarks: string;
  onFinalRemarksChange: (value: string) => void;
}

export default function EvaluationResultsTab({
  assessment,
  maturityModel,
  questions,
  reviews,
  progress,
  finalRemarks,
  onFinalRemarksChange,
}: EvaluationResultsTabProps) {
  const scaleN = Math.max(2, maturityModel?.levels?.length ?? 5);
  const flagged = questions.filter(
    (question) => reviews[question.responseKey]?.validationStatus === "FLAGGED"
  );
  const adjusted = questions.filter(
    (question) => reviews[question.responseKey]?.validationStatus === "ADJUSTED"
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Result preview
          </p>
          <h2 className="text-xl font-semibold text-gray-950">
            Preliminary results before submission
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <PreviewMetric
            label="Overall level"
            value={formatLevelWithNumber(
              assessment.overallMaturityLevel,
              maturityModel?.levels ?? null,
              scaleN
            )}
          />
          <PreviewMetric
            label="Overall score"
            value={formatScore1ToN(assessment.overallAverage, scaleN)}
          />
          <PreviewMetric
            label="Review progress"
            value={`${progress.reviewed}/${progress.total}`}
          />
        </div>

        <div className="mt-5 space-y-3">
          {assessment.dimensionResults?.map((dimension: any) => (
            <div
              key={dimension.dimensionId}
              className="rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-gray-950">
                  {dimension.dimensionName}
                </p>
                <p className="text-sm text-gray-600">
                  {formatLevelWithNumber(
                    dimension.maturityLevel,
                    maturityModel?.levels ?? null,
                    scaleN
                  )}{" "}
                  / {formatScore1ToN(dimension.averageScore, scaleN)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SummaryList
          title="Flagged questions"
          icon="flagged"
          questions={flagged}
          empty="No questions have been flagged."
        />
        <SummaryList
          title="Adjusted questions"
          icon="adjusted"
          questions={adjusted}
          empty="No questions have adjusted scores."
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="final-remarks"
          className="text-sm font-semibold text-gray-950"
        >
          Final remarks and recommendations
        </label>
        <textarea
          id="final-remarks"
          value={finalRemarks}
          maxLength={TEXT_LIMITS.description}
          onChange={(event) => onFinalRemarksChange(event.target.value)}
          rows={8}
          className="mt-3 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add final considerations, recommendations, and guidance for the organization."
        />
      </section>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-950">{value}</p>
    </div>
  );
}

function SummaryList({
  title,
  icon,
  questions,
  empty,
}: {
  title: string;
  icon: "flagged" | "adjusted";
  questions: EvaluationQuestion[];
  empty: string;
}) {
  const Icon = icon === "flagged" ? AlertTriangle : PencilLine;
  const color =
    icon === "flagged"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {questions.length > 0 ? (
          <Icon className="h-5 w-5 text-current" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        )}
        <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
      </div>
      {questions.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {questions.map((question) => (
            <div
              key={question.responseKey}
              className={`rounded-md border px-3 py-2 text-sm ${color}`}
            >
              <p className="font-semibold">{question.dimensionName}</p>
              <p className="mt-1">{question.question.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
