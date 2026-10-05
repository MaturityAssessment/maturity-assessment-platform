"use client";

import { CalendarDays, FileStack, Gauge, UserRound } from "lucide-react";
import { formatScore1ToN, formatLevelWithNumber } from "@/lib/maturityFormat";
import type { AssessmentDetail } from "./types";
import type { MaturityModel } from "@/api/types";

interface EvaluationSummaryPanelProps {
  assessment: AssessmentDetail;
  maturityModel: MaturityModel | null;
  evidenceCount: number;
}

export default function EvaluationSummaryPanel({
  assessment,
  maturityModel,
  evidenceCount,
}: EvaluationSummaryPanelProps) {
  const scaleN = Math.max(2, maturityModel?.levels?.length ?? 5);
  const stats = [
    {
      label: "Respondent",
      value: assessment.userEmail || "Unknown user",
      icon: UserRound,
    },
    {
      label: "Submitted",
      value: assessment.createdAt
        ? new Date(assessment.createdAt).toLocaleDateString()
        : "N/A",
      icon: CalendarDays,
    },
    {
      label: "Preliminary level",
      value: formatLevelWithNumber(
        assessment.overallMaturityLevel,
        maturityModel?.levels ?? null,
        scaleN
      ),
      icon: Gauge,
    },
    {
      label: "Evidence files/links",
      value: String(evidenceCount),
      icon: FileStack,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Assessment review
          </p>
          <h2 className="text-2xl font-semibold text-gray-950">
            {maturityModel?.name || "Maturity model"}
          </h2>
          <p className="text-sm text-gray-600">
            {assessment.domainName || maturityModel?.domain?.name || "No domain"}{" "}
            {assessment.maturityModelVersion || maturityModel?.version
              ? `/ Version ${assessment.maturityModelVersion || maturityModel?.version}`
              : ""}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                  <Icon className="h-4 w-4" />
                  {stat.label}
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-gray-950">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 max-w-sm">
          <Metric
            label="Preliminary score"
            value={formatScore1ToN(assessment.overallAverage, scaleN)}
          />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-950">{value}</p>
    </div>
  );
}
