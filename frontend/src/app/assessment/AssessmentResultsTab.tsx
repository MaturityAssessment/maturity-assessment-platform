"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  FileSpreadsheet,
  Lightbulb,
  Loader2,
  Minus,
  Scale,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AssessmentResponse,
  MaturityModel,
} from "@/api/types";
import { cn } from "@/lib/utils";
import { formatScore1ToN } from "@/lib/maturityFormat";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import {
  buildAssessmentResultMetrics,
  type AssessmentAdjustmentMetric,
} from "./assessmentResults";
import { buildAssessmentResultsExportData } from "./assessmentResultsExport";

type AssessmentResultsTabProps = {
  assessment: AssessmentResponse;
  model: MaturityModel;
  practiceSteps: AssessmentPracticeStep[];
};

export default function AssessmentResultsTab({
  assessment,
  model,
  practiceSteps,
}: AssessmentResultsTabProps) {
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const metrics = buildAssessmentResultMetrics(
    assessment,
    model,
    practiceSteps
  );
  const exportData = useMemo(
    () => buildAssessmentResultsExportData(assessment, model, practiceSteps),
    [assessment, model, practiceSteps]
  );
  const scaleMax = Math.max(
    1,
    model.levels?.reduce(
      (maximum, level) => Math.max(maximum, level.number),
      0
    ) || model.levels?.length || 5
  );
  const orderedLevels = [...(model.levels || [])].sort(
    (left, right) => left.number - right.number
  );
  const strongestDimension = metrics.dimensions.reduce<
    (typeof metrics.dimensions)[number] | null
  >(
    (strongest, dimension) =>
      !strongest || dimension.score > strongest.score
        ? dimension
        : strongest,
    null
  );
  const focusDimension = metrics.dimensions.reduce<
    (typeof metrics.dimensions)[number] | null
  >(
    (focus, dimension) =>
      !focus || dimension.score < focus.score ? dimension : focus,
    null
  );
  const createdAt = assessment.updatedAt || assessment.createdAt;

  const handleExport = async (format: "pdf" | "xlsx") => {
    setExportError(null);
    setExporting(format);
    try {
      const { exportAssessmentResults } = await import(
        "./assessmentResultsExportClient"
      );
      await exportAssessmentResults(exportData, format);
    } catch (error) {
      console.error(`Failed to export assessment results as ${format}`, error);
      setExportError(
        "The export could not be created. Please try again in a moment."
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <main
      id="assessment-panel-results"
      role="tabpanel"
      aria-labelledby="assessment-tab-results"
      className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-7 sm:px-6 lg:px-10 lg:pt-9"
    >
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-9 lg:px-10">
        <div
          className="absolute -right-24 -top-36 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Final evaluation
              </span>
              <div
                className="flex flex-wrap items-center gap-2"
                aria-label="Export assessment results"
              >
                <ExportButton
                  format="pdf"
                  label="Export PDF"
                  icon={FileText}
                  exporting={exporting}
                  onExport={handleExport}
                />
                <ExportButton
                  format="xlsx"
                  label="Export XLSX"
                  icon={FileSpreadsheet}
                  exporting={exporting}
                  onExport={handleExport}
                />
              </div>
            </div>
            {exportError && (
              <p
                className="mt-3 rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100"
                role="alert"
              >
                {exportError}
              </p>
            )}
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              Overall maturity level
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {assessment.overallMaturityLevel || "Not available"}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-white/10">
                <Award className="h-4 w-4 text-amber-300" aria-hidden="true" />
                {formatScore1ToN(metrics.overallScore, scaleMax)}
              </span>
              {metrics.finalLevelNumber != null && (
                <span className="text-sm text-slate-300">
                  Level {metrics.finalLevelNumber} of {scaleMax}
                </span>
              )}
              <span className="text-sm text-slate-400">
                Finalized{" "}
                {createdAt
                  ? new Date(createdAt).toLocaleDateString()
                  : "after evaluation"}
              </span>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300">
              This result is final and reflects the completed scoring outcome
              across all scorable assessment items.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  Maturity progression
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Your final position on this model’s scale
                </p>
              </div>
              <Target className="h-5 w-5 text-indigo-300" aria-hidden="true" />
            </div>
            <ol className="mt-5 space-y-2.5">
              {Array.from({ length: scaleMax }, (_, index) => index + 1).map(
                (levelNumber) => {
                  const current = levelNumber === metrics.finalLevelNumber;
                  const reached =
                    metrics.finalLevelNumber != null &&
                    levelNumber <= metrics.finalLevelNumber;
                  const levelName =
                    orderedLevels.find(
                      (level) => level.number === levelNumber
                    )?.name || `Level ${levelNumber}`;
                  return (
                    <li
                      key={levelNumber}
                      className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                          current
                            ? "border-indigo-300 bg-indigo-400 text-slate-950 ring-4 ring-indigo-400/15"
                            : reached
                              ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                              : "border-white/15 text-slate-500"
                        )}
                      >
                        {levelNumber}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs",
                          current
                            ? "font-semibold text-white"
                            : reached
                              ? "text-slate-300"
                              : "text-slate-500"
                        )}
                      >
                        {levelName}
                      </span>
                      {current && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                          Final
                        </span>
                      )}
                    </li>
                  );
                }
              )}
            </ol>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="results-at-a-glance"
        className="mt-7 grid gap-4 md:grid-cols-3"
      >
        <ResultInsightCard
          icon={Sparkles}
          eyebrow="Strongest dimension"
          title={strongestDimension?.name || "Not available"}
          detail={
            strongestDimension
              ? `${strongestDimension.score.toFixed(1)} / ${scaleMax} · ${strongestDimension.maturityLevel}`
              : "No dimension result was recorded."
          }
          tone="indigo"
        />
        <ResultInsightCard
          icon={Target}
          eyebrow="Best improvement focus"
          title={focusDimension?.name || "Not available"}
          detail={
            focusDimension
              ? `${focusDimension.score.toFixed(1)} / ${scaleMax} · Lowest dimension result`
              : "No dimension result was recorded."
          }
          tone="orange"
        />
        <ResultInsightCard
          icon={BarChart3}
          eyebrow="Scored item pattern"
          title={
            metrics.dominantLevel
              ? `${metrics.dominantLevel.count} items at Level ${metrics.dominantLevel.level}`
              : "No scored items"
          }
          detail={
            metrics.dominantLevel
              ? `${metrics.dominantLevel.name} is the most common evaluated level.`
              : "This assessment did not expose item-level scores."
          }
          tone="cyan"
        />
      </section>

      <section className="mt-9" aria-labelledby="result-representation-title">
        <div>
          <h2
            id="result-representation-title"
            className="text-xl font-bold tracking-tight text-slate-950"
          >
            What shaped this result
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Read the overall level alongside variation between dimensions and
            the distribution of individual item scores.
          </p>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <DimensionProfile
            dimensions={metrics.dimensions}
            overallScore={metrics.overallScore}
            scaleMax={scaleMax}
          />
          <ScoreDistribution
            data={metrics.scoreDistribution}
            scoredQuestionCount={metrics.scoredQuestionCount}
            finalLevelNumber={metrics.finalLevelNumber}
            belowFinalLevelCount={metrics.belowFinalLevelCount}
          />
        </div>
      </section>

      {metrics.adjustedItemCount > 0 && (
        <AdjustmentComparison
          adjustments={metrics.adjustments}
          adjustedItemCount={metrics.adjustedItemCount}
          raisedItemCount={metrics.raisedItemCount}
          loweredItemCount={metrics.loweredItemCount}
          unchangedItemCount={metrics.unchangedAdjustedItemCount}
          totalDelta={metrics.totalAdjustmentDelta}
          scaleMax={scaleMax}
        />
      )}

      <section
        className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        aria-labelledby="evaluator-guidance-title"
      >
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
                Final guidance
              </p>
              <h2
                id="evaluator-guidance-title"
                className="mt-0.5 text-lg font-bold text-slate-950"
              >
                Evaluator recommendations
              </h2>
            </div>
          </div>
          {assessment.evaluatorInsight?.trim() ? (
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {assessment.evaluatorInsight}
            </p>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-600">
              The evaluator did not add final recommendations for this
              assessment.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Supporting context
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-950">
                Notes on evaluated items
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-600">
              {metrics.evaluatorNotes.length}
            </span>
          </div>

          {metrics.evaluatorNotes.length > 0 ? (
            <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {metrics.evaluatorNotes.map((note) => (
                <article
                  key={note.responseKey}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        note.status === "ADJUSTED"
                          ? "bg-cyan-100 text-cyan-700"
                          : note.status === "FLAGGED"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {note.status?.toLowerCase() || "reviewed"}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {note.dimensionName} / {note.moduleName} /{" "}
                      {note.practiceName}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">
                    {note.questionText}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {note.note}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center">
              <FileText className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">
                No item-specific notes were recorded.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ExportButton({
  format,
  label,
  icon: Icon,
  exporting,
  onExport,
}: {
  format: "pdf" | "xlsx";
  label: string;
  icon: typeof Download;
  exporting: "pdf" | "xlsx" | null;
  onExport: (format: "pdf" | "xlsx") => Promise<void>;
}) {
  const active = exporting === format;
  return (
    <button
      type="button"
      onClick={() => void onExport(format)}
      disabled={exporting !== null}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white transition hover:border-white/25 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-wait disabled:opacity-60"
    >
      {active ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {active ? "Preparing…" : label}
    </button>
  );
}

function ResultInsightCard({
  icon: Icon,
  eyebrow,
  title,
  detail,
  tone,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  detail: string;
  tone: "indigo" | "orange" | "cyan";
}) {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-700",
    orange: "bg-orange-50 text-orange-700",
    cyan: "bg-cyan-50 text-cyan-700",
  }[tone];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
          styles
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-1 truncate text-base font-bold text-slate-950">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function DimensionProfile({
  dimensions,
  overallScore,
  scaleMax,
}: {
  dimensions: ReturnType<
    typeof buildAssessmentResultMetrics
  >["dimensions"];
  overallScore: number;
  scaleMax: number;
}) {
  const radarData = dimensions.map((dimension) => ({
    name: dimension.name,
    dimensionScore: dimension.score,
    overallScore,
  }));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-950">Dimension profile</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Each dimension is compared with the final overall score.
          </p>
        </div>
        <Scale className="h-5 w-5 shrink-0 text-indigo-500" aria-hidden="true" />
      </div>

      {dimensions.length > 2 ? (
        <div className="mt-4 h-[330px] w-full" aria-label="Dimension radar chart">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="68%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: "#475569", fontSize: 11 }}
                tickFormatter={(value: string) =>
                  value.length > 18 ? `${value.slice(0, 16)}…` : value
                }
              />
              <PolarRadiusAxis
                domain={[0, scaleMax]}
                tickCount={scaleMax + 1}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Final overall"
                dataKey="overallScore"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.08}
                strokeDasharray="5 4"
                strokeWidth={2}
              />
              <Radar
                name="Dimension score"
                dataKey="dimensionScore"
                stroke="#4f46e5"
                fill="#6366f1"
                fillOpacity={0.22}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${Number(value).toFixed(1)} / ${scaleMax}`,
                  name,
                ]}
                contentStyle={chartTooltipStyle}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {dimensions.map((dimension) => (
            <DimensionScoreRow
              key={dimension.dimensionId}
              dimension={dimension}
              overallScore={overallScore}
              scaleMax={scaleMax}
            />
          ))}
        </div>
      )}

      {dimensions.length > 2 && (
        <div className="mt-2 space-y-3 border-t border-slate-100 pt-4">
          {dimensions.map((dimension) => (
            <DimensionScoreRow
              key={dimension.dimensionId}
              dimension={dimension}
              overallScore={overallScore}
              scaleMax={scaleMax}
              compact
            />
          ))}
        </div>
      )}
    </article>
  );
}

function DimensionScoreRow({
  dimension,
  overallScore,
  scaleMax,
  compact = false,
}: {
  dimension: ReturnType<
    typeof buildAssessmentResultMetrics
  >["dimensions"][number];
  overallScore: number;
  scaleMax: number;
  compact?: boolean;
}) {
  const difference = dimension.score - overallScore;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-semibold text-slate-700">
          {dimension.name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-bold tabular-nums text-slate-900">
            {dimension.score.toFixed(1)}
          </span>
          <DeltaBadge value={difference} suffix=" vs overall" />
        </span>
      </div>
      {!compact && (
        <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${(dimension.score / scaleMax) * 100}%` }}
          />
          <span
            className="absolute inset-y-[-2px] w-0.5 bg-cyan-600"
            style={{ left: `${(overallScore / scaleMax) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

function ScoreDistribution({
  data,
  scoredQuestionCount,
  finalLevelNumber,
  belowFinalLevelCount,
}: {
  data: ReturnType<
    typeof buildAssessmentResultMetrics
  >["scoreDistribution"];
  scoredQuestionCount: number;
  finalLevelNumber: number | null;
  belowFinalLevelCount: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-950">Item score distribution</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Shows which maturity levels are most common across evaluated items.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold tabular-nums text-indigo-700">
          {scoredQuestionCount} scored
        </span>
      </div>

      {scoredQuestionCount > 0 ? (
        <>
          <div className="mt-5 h-[300px] w-full" aria-label="Question score distribution bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: -16, bottom: 4 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="level"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(level: number) => `Level ${level}`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value} ${Number(value) === 1 ? "item" : "items"}`,
                    "Evaluated",
                  ]}
                  labelFormatter={(level) => {
                    const item = data.find(
                      (candidate) => candidate.level === Number(level)
                    );
                    return `Level ${level}${item ? ` · ${item.name}` : ""}`;
                  }}
                  contentStyle={chartTooltipStyle}
                />
                <Bar
                  dataKey="count"
                  name="Evaluated items"
                  fill="#4f46e5"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={54}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            {finalLevelNumber != null && belowFinalLevelCount > 0 ? (
              <>
                <span className="font-bold text-slate-800">
                  {belowFinalLevelCount}{" "}
                  {belowFinalLevelCount === 1 ? "item sits" : "items sit"} below
                  the final Level {finalLevelNumber}.
                </span>{" "}
                These lower-scoring items are the clearest candidates to
                investigate when planning the next maturity step.
              </>
            ) : (
              <>
                No scored items fall below the final maturity level. Continue
                strengthening consistency across dimensions.
              </>
            )}
          </div>
        </>
      ) : (
        <EmptyChartMessage>
          Item-level scoring was not available for this assessment.
        </EmptyChartMessage>
      )}
    </article>
  );
}

function AdjustmentComparison({
  adjustments,
  adjustedItemCount,
  raisedItemCount,
  loweredItemCount,
  unchangedItemCount,
  totalDelta,
  scaleMax,
}: {
  adjustments: AssessmentAdjustmentMetric[];
  adjustedItemCount: number;
  raisedItemCount: number;
  loweredItemCount: number;
  unchangedItemCount: number;
  totalDelta: number;
  scaleMax: number;
}) {
  return (
    <section className="mt-9" aria-labelledby="evaluator-impact-title">
      <div>
        <h2
          id="evaluator-impact-title"
          className="text-xl font-bold tracking-tight text-slate-950"
        >
          Evaluator adjustment impact
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Compares original automatic scores with revised evaluator scores.
          Open answers and other items without an automatic score are excluded.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <AdjustmentStat
            label="Adjusted"
            value={adjustedItemCount}
            icon={Scale}
            tone="slate"
          />
          <AdjustmentStat
            label="Raised"
            value={raisedItemCount}
            icon={ArrowUp}
            tone="emerald"
          />
          <AdjustmentStat
            label="Lowered"
            value={loweredItemCount}
            icon={ArrowDown}
            tone="orange"
          />
          <AdjustmentStat
            label="Net points"
            value={`${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(1)}`}
            icon={totalDelta > 0 ? ArrowUp : totalDelta < 0 ? ArrowDown : Minus}
            tone={totalDelta > 0 ? "emerald" : totalDelta < 0 ? "orange" : "slate"}
          />
        </div>

        {adjustments.length > 0 && (
          <>
            <div
              className="mt-7 h-[300px] w-full"
              aria-label="Original and evaluator-adjusted score comparison"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={adjustments}
                  layout="vertical"
                  margin={{ top: 8, right: 20, left: 12, bottom: 4 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, scaleMax]}
                    tickCount={scaleMax + 1}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={116}
                    tick={{ fill: "#475569", fontSize: 11 }}
                    tickFormatter={(value: string) =>
                      value.length > 18 ? `${value.slice(0, 16)}…` : value
                    }
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${Number(value).toFixed(1)} / ${scaleMax}`,
                      name,
                    ]}
                    contentStyle={chartTooltipStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="initialAverage"
                    name="Original automatic"
                    fill="#94a3b8"
                    radius={[0, 5, 5, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="finalAverage"
                    name="Evaluator revised"
                    fill="#06b6d4"
                    radius={[0, 5, 5, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {adjustments.map((adjustment) => (
                <div
                  key={adjustment.dimensionId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {adjustment.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {adjustment.itemCount} adjusted ·{" "}
                      {adjustment.raisedCount} raised ·{" "}
                      {adjustment.loweredCount} lowered
                    </p>
                  </div>
                  <DeltaBadge value={adjustment.delta} suffix=" avg" />
                </div>
              ))}
            </div>
          </>
        )}

        {unchangedItemCount > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            {unchangedItemCount} adjusted{" "}
            {unchangedItemCount === 1 ? "item retained" : "items retained"} the
            original automatic score.
          </p>
        )}
      </div>
    </section>
  );
}

function AdjustmentStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Scale;
  tone: "slate" | "emerald" | "orange";
}) {
  const styles = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className={cn("rounded-lg p-1.5", styles)}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">
        {value}
      </p>
    </div>
  );
}

function DeltaBadge({ value, suffix }: { value: number; suffix: string }) {
  const nearlyEqual = Math.abs(value) < 0.05;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
        nearlyEqual
          ? "bg-slate-100 text-slate-600"
          : value > 0
            ? "bg-emerald-50 text-emerald-700"
            : "bg-orange-50 text-orange-700"
      )}
    >
      {nearlyEqual ? (
        <Minus className="h-2.5 w-2.5" aria-hidden="true" />
      ) : value > 0 ? (
        <ArrowUp className="h-2.5 w-2.5" aria-hidden="true" />
      ) : (
        <ArrowDown className="h-2.5 w-2.5" aria-hidden="true" />
      )}
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

function EmptyChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex min-h-[250px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
  fontSize: 12,
};
