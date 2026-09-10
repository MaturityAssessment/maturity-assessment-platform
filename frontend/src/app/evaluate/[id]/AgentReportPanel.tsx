"use client";

import { useRef, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Bot,
  Download,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import type { Evidence, MaturityModel } from "@/api/types";
import type { AgentReport, AssessmentDetail } from "./types";

const AGENT_REPORT_SCHEMA_EXAMPLE = {
  assessmentId: 123,
  summary: "Short assessment summary.",
  warnings: [
    {
      severity: "low | medium | high",
      questionId: 55,
      responseKey: "optional-response-key",
      message: "Potential inconsistency or concern.",
      recommendation: "What the curator should check.",
    },
  ],
  inconsistencies: [
    {
      area: "Dimension/practice/question area",
      observation: "What seems inconsistent.",
      evidence: "Which answer or evidence triggered it.",
    },
  ],
  nextSteps: ["Short recommendation to improve maturity level."],
};

interface AgentReportPanelProps {
  assessment: AssessmentDetail;
  maturityModel: MaturityModel | null;
  evidence: Evidence[];
  agentReport: AgentReport | null;
  error: string | null;
  localAgentLoading: boolean;
  onImport: (report: AgentReport, formattedInsight: string) => void;
  onRunLocalAgent: () => void;
  onError: (message: string | null) => void;
}

export default function AgentReportPanel({
  assessment,
  maturityModel,
  evidence,
  agentReport,
  error,
  localAgentLoading,
  onImport,
  onRunLocalAgent,
  onError,
}: AgentReportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const payload = buildAgentAssessmentExport(
      assessment,
      maturityModel,
      evidence
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assessment-${assessment.id}-agent-context.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    onError(null);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const report = parseAgentReport(parsed, assessment.id);
      onImport(report, formatAgentReportForInsight(report));
      onError(null);
    } catch (err: any) {
      onError(err?.message || "Failed to import agent report JSON.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-950">
              Agent-assisted review
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Export the assessment context for external analysis, then import a
              JSON report as advisory guidance for final remarks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <button
            type="button"
            onClick={onRunLocalAgent}
            disabled={localAgentLoading}
            className="inline-flex h-9 min-w-[172px] items-center justify-center gap-2 whitespace-nowrap rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {localAgentLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            {localAgentLoading ? "Running beta..." : "Run local agent beta"}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={localAgentLoading}
            className="inline-flex h-9 min-w-[132px] items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={localAgentLoading}
            className="inline-flex h-9 min-w-[132px] items-center justify-center gap-2 whitespace-nowrap rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Import report
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Agent reports are advisory. The local beta can prefill draft review
        fields, but it never submits or completes the assessment.
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {agentReport ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <ReportSection title="Summary">
            <p>{agentReport.summary}</p>
          </ReportSection>
          <ReportSection title="Warnings">
            {agentReport.warnings.length === 0 ? (
              <p>No warnings included.</p>
            ) : (
              <ul className="space-y-2">
                {agentReport.warnings.map((warning, index) => (
                  <li key={`${warning.responseKey || warning.questionId}-${index}`}>
                    <span className="font-semibold uppercase">
                      {warning.severity}
                    </span>
                    : {warning.message}
                  </li>
                ))}
              </ul>
            )}
          </ReportSection>
          <ReportSection title="Next steps">
            {agentReport.nextSteps.length === 0 ? (
              <p>No next steps included.</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-4">
                {agentReport.nextSteps.map((step, index) => (
                  <li key={`${step}-${index}`}>{step}</li>
                ))}
              </ol>
            )}
          </ReportSection>
          {agentReport.documentSummaries &&
            agentReport.documentSummaries.length > 0 && (
              <ReportSection title="Evidence summaries">
                <ul className="space-y-2">
                  {agentReport.documentSummaries.slice(0, 5).map((item, index) => (
                    <li key={`${item.evidenceId}-${item.questionId}-${index}`}>
                      <span className="font-semibold">
                        {item.fileName || item.urlHost || `Evidence ${item.evidenceId}`}
                      </span>
                      : {item.summary || item.warning || "Metadata only."}
                    </li>
                  ))}
                </ul>
              </ReportSection>
            )}
          {agentReport.processingNotes &&
            agentReport.processingNotes.length > 0 && (
              <ReportSection title="Processing notes">
                <ul className="space-y-1">
                  {agentReport.processingNotes.slice(0, 5).map((note, index) => (
                    <li key={`${note}-${index}`}>{note}</li>
                  ))}
                </ul>
              </ReportSection>
            )}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
          No agent report imported.
        </div>
      )}
    </section>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
      <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function sanitizeEvidenceForExport(items: Evidence[]) {
  return items.map((item) => ({
    id: item.id,
    questionId: item.questionId,
    evidenceType: item.evidenceType,
    description: item.description || "",
    fileName: item.fileName || null,
    fileType: item.fileType || null,
    url: item.url || null,
    createdAt: item.createdAt,
    note:
      item.evidenceType === "FILE"
        ? "File content is not included in this export."
        : "External URL is included as respondent-provided evidence metadata.",
  }));
}

function buildAgentAssessmentExport(
  assessment: AssessmentDetail,
  maturityModel: MaturityModel | null,
  evidence: Evidence[]
) {
  const maxScale = Math.max(2, maturityModel?.levels?.length ?? 5);
  return {
    exportType: "maturity-assessment-agent-context",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    assessment: {
      id: assessment.id,
      createdAt: assessment.createdAt,
      status: assessment.status || "PENDING_REVIEW",
      isCompleted: assessment.isCompleted,
      maturityModelId: assessment.maturityModelId,
      maturityModelName: maturityModel?.name || null,
      domainName:
        assessment.domainName || maturityModel?.domain?.name || null,
      respondentEmail: assessment.userEmail || null,
    },
    maturityScale: {
      maxLevel: maxScale,
      levels:
        maturityModel?.levels?.map((level) => ({
          number: level.number,
          name: level.name,
          description: level.description || "",
        })) || [],
    },
    currentResults: {
      status: "preliminary-pending-curator-review",
      overallAverage: assessment.overallAverage,
      overallPercentageScore: assessment.overallPercentageScore ?? null,
      overallMaturityLevel: assessment.overallMaturityLevel,
      dimensionResults: assessment.dimensionResults || [],
    },
    respondentAnswers: Object.values(
      assessment.questionEvaluations || {}
    )
      .filter((evaluation) => evaluation.response !== undefined)
      .map((evaluation) => ({
        responseKey: evaluation.responseKey,
        questionId: evaluation.questionId,
        value: evaluation.response,
        initialScore: evaluation.initialScore ?? null,
      })),
    modelStructure: maturityModel?.dimensions || [],
    evidenceMetadata: sanitizeEvidenceForExport(evidence),
    evaluatorTask: {
      instructions: [
        "Identify contradictions between answers, evidence metadata, and maturity claims.",
        "Flag missing or weak evidence for high maturity claims.",
        "Do not change scores directly and do not submit the evaluation.",
        "Produce concise curator-facing notes.",
        "Return valid JSON only using expectedImportSchema.",
      ],
      expectedImportSchema: AGENT_REPORT_SCHEMA_EXAMPLE,
    },
  };
}

function parseAgentReport(raw: unknown, assessmentId: number): AgentReport {
  if (!raw || typeof raw !== "object") {
    throw new Error("Agent report must be a JSON object.");
  }
  const data = raw as Record<string, unknown>;
  const reportAssessmentId = Number(data.assessmentId);
  if (!Number.isFinite(reportAssessmentId)) {
    throw new Error("Agent report must include a numeric assessmentId.");
  }
  if (reportAssessmentId !== Number(assessmentId)) {
    throw new Error(
      `Agent report assessmentId ${reportAssessmentId} does not match this assessment (${assessmentId}).`
    );
  }
  if (typeof data.summary !== "string" || !data.summary.trim()) {
    throw new Error("Agent report must include a non-empty summary.");
  }

  const warningsInput = Array.isArray(data.warnings) ? data.warnings : [];
  const inconsistenciesInput = Array.isArray(data.inconsistencies)
    ? data.inconsistencies
    : [];
  const nextStepsInput = Array.isArray(data.nextSteps) ? data.nextSteps : [];

  return {
    assessmentId: reportAssessmentId,
    summary: data.summary.trim(),
    source: "import",
    warnings: warningsInput.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Warning ${index + 1} must be an object.`);
      }
      const warning = item as Record<string, unknown>;
      const severity = String(warning.severity || "medium").toLowerCase();
      if (!["low", "medium", "high"].includes(severity)) {
        throw new Error(
          `Warning ${index + 1} severity must be low, medium, or high.`
        );
      }
      if (typeof warning.message !== "string" || !warning.message.trim()) {
        throw new Error(`Warning ${index + 1} must include a message.`);
      }
      return {
        severity: severity as AgentReport["warnings"][number]["severity"],
        questionId:
          warning.questionId == null ? undefined : Number(warning.questionId),
        responseKey:
          typeof warning.responseKey === "string"
            ? warning.responseKey
            : undefined,
        message: warning.message.trim(),
        recommendation:
          typeof warning.recommendation === "string"
            ? warning.recommendation.trim()
            : undefined,
      };
    }),
    inconsistencies: inconsistenciesInput.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Inconsistency ${index + 1} must be an object.`);
      }
      const inconsistency = item as Record<string, unknown>;
      if (
        typeof inconsistency.area !== "string" ||
        !inconsistency.area.trim() ||
        typeof inconsistency.observation !== "string" ||
        !inconsistency.observation.trim()
      ) {
        throw new Error(
          `Inconsistency ${index + 1} must include area and observation.`
        );
      }
      return {
        area: inconsistency.area.trim(),
        observation: inconsistency.observation.trim(),
        evidence:
          typeof inconsistency.evidence === "string"
            ? inconsistency.evidence.trim()
            : undefined,
      };
    }),
    nextSteps: nextStepsInput
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function formatAgentReportForInsight(report: AgentReport) {
  const lines = [
    "Agent-assisted assessment report",
    "",
    "Summary:",
    report.summary,
  ];
  if (report.warnings.length > 0) {
    lines.push("", "Warnings:");
    report.warnings.forEach((warning, index) => {
      lines.push(
        `${index + 1}. [${warning.severity.toUpperCase()}] ${warning.message}`
      );
      if (warning.recommendation) {
        lines.push(`   Recommendation: ${warning.recommendation}`);
      }
    });
  }
  if (report.nextSteps.length > 0) {
    lines.push("", "Suggested next steps:");
    report.nextSteps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }
  lines.push(
    "",
    "Note: This report is advisory. The curator remains responsible for manual scoring and final evaluation."
  );
  return lines.join("\n");
}
