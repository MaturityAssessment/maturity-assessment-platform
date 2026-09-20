"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProgressBarProps = {
  completed: number;
  total: number;
  stepTitle?: string;
  stepDescription?: string;
  previousLabel?: string;
  onPrevious?: () => void;
  disablePrevious?: boolean;
  nextLabel?: string;
  onNext?: () => void;
  disableNext?: boolean;
};

export default function ProgressBar({
  completed,
  total,
  stepTitle,
  stepDescription,
  previousLabel,
  onPrevious,
  disablePrevious = false,
  nextLabel,
  onNext,
  disableNext = false,
}: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const clampedCompleted = Math.min(Math.max(completed, 0), safeTotal);
  const percentage = Math.round((clampedCompleted / safeTotal) * 100);
  const showPrevious = Boolean(previousLabel && onPrevious);
  const showNext = Boolean(nextLabel && onNext);

  return (
    <section className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Step {clampedCompleted}/{safeTotal}
          </p>
          {stepTitle && (
            <h2 className="mt-1 text-xl font-semibold text-gray-950">
              {stepTitle}
            </h2>
          )}
          {stepDescription && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {stepDescription}
            </p>
          )}
        </div>

        {(showPrevious || showNext) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            {showPrevious && (
              <Button
                type="button"
                variant="outline"
                onClick={onPrevious}
                disabled={disablePrevious}
              >
                <ArrowLeft className="h-4 w-4" />
                {previousLabel}
              </Button>
            )}
            {showNext && (
              <Button
                type="button"
                onClick={onNext}
                disabled={disableNext}
              >
                {nextLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="whitespace-nowrap text-xs font-medium text-gray-600">
          {clampedCompleted}/{safeTotal}
        </p>
      </div>
    </section>
  );
}
