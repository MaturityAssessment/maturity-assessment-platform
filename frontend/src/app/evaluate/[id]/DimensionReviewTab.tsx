"use client";

import QuestionReviewCard from "./QuestionReviewCard";
import type { MaturityLevel } from "@/api/types";
import type {
  EvaluationDimension,
  QuestionReviewDraft,
} from "./types";

interface DimensionReviewTabProps {
  dimension: EvaluationDimension;
  reviews: Record<string, QuestionReviewDraft>;
  maturityLevels: MaturityLevel[];
  scoreOptions: Array<{ value: number; label: string }>;
  onReviewChange: (responseKey: string, review: QuestionReviewDraft) => void;
  onDownloadEvidence: (evidenceId: number, fileName?: string | null) => void;
}

export default function DimensionReviewTab({
  dimension,
  reviews,
  maturityLevels,
  scoreOptions,
  onReviewChange,
  onDownloadEvidence,
}: DimensionReviewTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-950">
          {dimension.name}
        </h2>
        {dimension.description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
            {dimension.description}
          </p>
        )}
      </div>

      {dimension.groups.map((group) => (
        <section
          key={`${group.moduleName}-${group.practiceName}`}
          className="space-y-3"
        >
          <div className="border-b border-gray-200 pb-2">
            <p className="text-xs font-semibold uppercase text-gray-500">
              {group.moduleName}
            </p>
            <h3 className="text-sm font-semibold text-gray-900">
              {group.practiceName}
            </h3>
          </div>

          {group.questions.map((question) => (
            <QuestionReviewCard
              key={question.responseKey}
              question={question}
              review={
                reviews[question.responseKey] || {
                  reviewerNote: "",
                }
              }
              maturityLevels={maturityLevels}
              scoreOptions={scoreOptions}
              onChange={onReviewChange}
              onDownloadEvidence={onDownloadEvidence}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
