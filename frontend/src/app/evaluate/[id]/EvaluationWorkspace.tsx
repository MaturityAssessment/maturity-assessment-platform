"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal, TopNavbar, Notice, PageLoading } from "@/components";
import apiClient from "@/api/axios";
import { useAuth } from "@/context";
import type {
  AgentEvaluationDraftResponse,
  Evidence,
  ManualEvaluationRequest,
  MaturityModel,
  QuestionEvaluationStatus,
} from "@/api/types";
import AgentReportPanel from "./AgentReportPanel";
import DimensionReviewTab from "./DimensionReviewTab";
import EvaluationActionBar from "./EvaluationActionBar";
import EvaluationResultsTab from "./EvaluationResultsTab";
import EvaluationSummaryPanel from "./EvaluationSummaryPanel";
import EvaluationTabs from "./EvaluationTabs";
import {
  buildEvaluationModel,
  calculateProgress,
  initialReviewDrafts,
} from "./evaluationModel";
import type {
  AgentReport,
  AssessmentDetail,
  EvaluationTab,
  QuestionReviewDraft,
} from "./types";

interface EvaluationWorkspaceProps {
  assessmentId: string;
}

export default function EvaluationWorkspace({
  assessmentId,
}: EvaluationWorkspaceProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [maturityModel, setMaturityModel] = useState<MaturityModel | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [reviews, setReviews] = useState<Record<string, QuestionReviewDraft>>(
    {}
  );
  const [finalRemarks, setFinalRemarks] = useState("");
  const [agentReport, setAgentReport] = useState<AgentReport | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [localAgentLoading, setLocalAgentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<EvaluationTab>("general");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    type: "error" | "success" | "warning";
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [sendingBack, setSendingBack] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendBackModal, setShowSendBackModal] = useState(false);

  const canDeleteAssessment =
    user?.role === "CURATOR" || user?.role === "ADMIN";

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const [assessmentResponse, evidenceResponse] = await Promise.all([
          apiClient.get(`/api/v1/assessments/${assessmentId}`),
          apiClient
            .get(`/api/v1/evidence/assessment/${assessmentId}`)
            .catch(() => ({ data: [] })),
        ]);

        const assessmentData: AssessmentDetail = assessmentResponse.data;
        if (
          assessmentData.status !== "PENDING_REVIEW" ||
          assessmentData.isCompleted
        ) {
          setAssessment(null);
          setNotice({
            type: "error",
            message:
              assessmentData.status === "COMPLETED" ||
              assessmentData.isCompleted
                ? "This assessment has already been reviewed and completed."
                : "Only submitted assessments pending review can be evaluated.",
          });
          return;
        }

        setAssessment(assessmentData);
        setFinalRemarks(assessmentData.evaluatorInsight || "");
        setEvidence(evidenceResponse.data || assessmentData.evidence || []);

        if (assessmentData.maturityModelId) {
          const modelResponse = await apiClient.get(
            `/api/v1/maturity-model/${assessmentData.maturityModelId}`
          );
          setMaturityModel(modelResponse.data);
        } else {
          setMaturityModel(null);
        }
      } catch (err: any) {
        setNotice({
          type: "error",
          message:
            err.response?.status === 403
              ? err.errorMessage ||
                "Access denied. You do not have permission to view this assessment."
              : "Failed to load assessment details. Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (assessmentId) {
      void fetchAssessment();
    }
  }, [assessmentId]);

  const evaluationModel = useMemo(() => {
    if (!assessment) return null;
    return buildEvaluationModel(assessment, maturityModel, evidence);
  }, [assessment, maturityModel, evidence]);

  useEffect(() => {
    if (!evaluationModel || !assessment) return;
    setReviews(initialReviewDrafts(evaluationModel.questions, assessment));
  }, [assessment, evaluationModel]);

  const scoreOptions = useMemo(() => {
    const levels = maturityModel?.levels?.length
      ? [...maturityModel.levels].sort((a, b) => a.number - b.number)
      : null;
    const n = Math.max(2, levels?.length ?? 5);
    return Array.from({ length: n }, (_, index) => {
      const value = index + 1;
      const levelName = levels?.find((level) => level.number === value)?.name;
      return {
        value,
        label: levelName ? `Level ${value}: ${levelName}` : `Level ${value}`,
      };
    });
  }, [maturityModel?.levels]);
  const maturityLevels = useMemo(
    () =>
      maturityModel?.levels?.length
        ? [...maturityModel.levels].sort((a, b) => a.number - b.number)
        : [],
    [maturityModel?.levels]
  );

  const progress = useMemo(
    () => calculateProgress(evaluationModel?.questions || [], reviews),
    [evaluationModel?.questions, reviews]
  );
  const canSubmit =
    progress.missingStatus === 0 &&
    progress.missingManualScores === 0 &&
    progress.missingNotes === 0 &&
    progress.flagged === 0;
  const canSendBack =
    progress.flagged > 0 &&
    (evaluationModel?.questions || [])
      .filter(
        (question) =>
          reviews[question.responseKey]?.validationStatus === "FLAGGED"
      )
      .every((question) =>
        Boolean(reviews[question.responseKey]?.reviewerNote?.trim())
      );

  const currentDimension =
    activeTab.startsWith("dimension:") && evaluationModel
      ? evaluationModel.dimensions.find(
          (dimension) => `dimension:${dimension.id}` === activeTab
        )
      : null;

  const handleReviewChange = (
    responseKey: string,
    nextReview: QuestionReviewDraft
  ) => {
    setReviews((previous) => ({
      ...previous,
      [responseKey]: nextReview,
    }));
  };

  const handleRunLocalAgent = async () => {
    if (!assessment || !evaluationModel) return;

    try {
      setLocalAgentLoading(true);
      setAgentError(null);
      setNotice(null);
      const response = await apiClient.post<AgentEvaluationDraftResponse>(
        `/api/v1/assessments/${assessmentId}/agent-evaluation/draft`
      );
      const draft = response.data;
      if (Number(draft.assessmentId) !== Number(assessment.id)) {
        throw new Error("Local agent draft did not match this assessment.");
      }

      const reviewableKeys = new Set(
        evaluationModel.questions.map((question) => question.responseKey)
      );
      setReviews((previous) => {
        const next = { ...previous };
        Object.entries(draft.questionEvaluations || {}).forEach(
          ([responseKey, evaluation]) => {
            if (!reviewableKeys.has(responseKey)) return;
            const status = normalizeDraftStatus(evaluation.validationStatus);
            next[responseKey] = {
              validationStatus: status,
              manualScore:
                typeof evaluation.manualScore === "number"
                  ? evaluation.manualScore
                  : undefined,
              reviewerNote: evaluation.reviewerNote || "",
            };
          }
        );
        return next;
      });

      setFinalRemarks(draft.finalRemarks?.trim() || draft.summary || "");
      setAgentReport(localAgentDraftToReport(draft));
      setNotice({
        type: "warning",
        message:
          "Local agent beta draft applied. Review the suggested statuses, notes, scores, and final remarks before submitting.",
      });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to run local agent beta. Check LM Studio and local-agent configuration.";
      setAgentError(message);
      setNotice({ type: "error", message });
    } finally {
      setLocalAgentLoading(false);
    }
  };

  const handleDownloadEvidence = async (
    evidenceId: number,
    fileName?: string | null
  ) => {
    const downloadName =
      fileName && fileName.trim() ? fileName : `evidence-${evidenceId}`;
    try {
      const response = await apiClient.get(
        `/api/v1/evidence/${evidenceId}/download`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setNotice({
        type: "error",
        message: "Failed to download evidence file. Please try again.",
      });
    }
  };

  const buildReviewPayload = (): ManualEvaluationRequest => {
    const questionEvaluations = Object.fromEntries(
      (evaluationModel?.questions || []).map((question) => {
        const review = reviews[question.responseKey];
        return [
          question.responseKey,
          {
            questionId: question.questionId,
            validationStatus: review?.validationStatus,
            manualScore: review?.manualScore,
            reviewerNote: review?.reviewerNote?.trim() || undefined,
          },
        ];
      })
    );

    return {
      manualScores: {},
      questionEvaluations,
      evaluatorInsight: finalRemarks,
    };
  };

  const persistReviewProgress = async () => {
    if (!evaluationModel || evaluationModel.questions.length === 0) return;
    await apiClient.put(
      `/api/v1/assessments/${assessmentId}/evaluation/reviews`,
      buildReviewPayload()
    );
  };

  const handleSaveProgress = async () => {
    if (!assessment || !evaluationModel || evaluationModel.questions.length === 0) {
      return;
    }
    try {
      setSavingProgress(true);
      setNotice(null);
      await persistReviewProgress();
      setNotice({
        type: "success",
        message: "Review progress saved to this assessment.",
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        message:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to save review progress. Please try again.",
      });
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!assessment || !evaluationModel) return;
    if (!canSubmit) {
      setNotice({
        type: "error",
        message:
          "Review every required status, score, and note, and resolve or send back all flagged items before finishing.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setNotice(null);
      if (evaluationModel.questions.length === 0) {
        await apiClient.put(`/api/v1/assessments/${assessmentId}/complete`, {
          evaluatorInsight: finalRemarks,
        });
      } else {
        await persistReviewProgress();
        await apiClient.put(
          `/api/v1/assessments/${assessmentId}/evaluation/finish`,
          { evaluatorInsight: finalRemarks }
        );
      }
      router.push("/evaluate");
    } catch (err: any) {
      setNotice({
        type: "error",
        message:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to submit evaluation. Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendBack = async () => {
    if (!assessment || !evaluationModel || !canSendBack) return;
    try {
      setSendingBack(true);
      setNotice(null);
      await persistReviewProgress();
      await apiClient.put(
        `/api/v1/assessments/${assessmentId}/evaluation/send-back`,
        { evaluatorInsight: finalRemarks }
      );
      setShowSendBackModal(false);
      router.push("/evaluate");
    } catch (err: any) {
      setNotice({
        type: "error",
        message:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to send the assessment back. Please try again.",
      });
      setShowSendBackModal(false);
    } finally {
      setSendingBack(false);
    }
  };

  const handleConfirmDeleteAssessment = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/v1/assessments/${assessmentId}`);
      setShowDeleteModal(false);
      router.push("/evaluate");
    } catch (err: any) {
      setNotice({
        type: "error",
        message:
          err.response?.data?.message ||
          "Failed to delete assessment. Please try again later.",
      });
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <PageLoading message="Loading assessment details..." />;
  }

  if (!assessment || !evaluationModel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar
          title="Evaluate Assessment"
          subtitle="Review submitted assessment"
          backButton={{ href: "/evaluate" }}
        />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          {notice && (
            <Notice
              type={notice.type}
              message={notice.message}
              onDismiss={() => setNotice(null)}
            />
          )}
          <button
            type="button"
            onClick={() => router.push("/evaluate")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to evaluations
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <TopNavbar
        title="Evaluate Assessment"
        subtitle="Validate submitted answers and prepare final recommendations"
        backButton={{ href: "/evaluate" }}
        rightActions={
          canDeleteAssessment ? (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={
                submitting || savingProgress || sendingBack || isDeleting
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50"
              aria-label="Delete assessment"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null
        }
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete assessment"
        maxWidth="md"
        closeButtonDisabled={isDeleting}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteAssessment}
              disabled={isDeleting}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        }
      >
        <p className="text-gray-700">
          Are you sure you want to delete this assessment? This action cannot be
          undone.
        </p>
      </Modal>

      <Modal
        isOpen={showSendBackModal}
        onClose={() => !sendingBack && setShowSendBackModal(false)}
        title="Send assessment back for changes"
        maxWidth="md"
        closeButtonDisabled={sendingBack}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSendBackModal(false)}
              disabled={sendingBack}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendBack}
              disabled={sendingBack || !canSendBack}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {sendingBack ? "Sending back..." : "Send back"}
            </button>
          </div>
        }
      >
        <p className="text-gray-700">
          This will return the assessment with {progress.flagged} flagged item
          {progress.flagged === 1 ? "" : "s"}. The respondent will receive the
          reviewer notes as guidance for a future resubmission.
        </p>
      </Modal>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {notice && (
          <Notice
            type={notice.type}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        )}

        <EvaluationTabs
          activeTab={activeTab}
          dimensions={evaluationModel.dimensions}
          onChange={setActiveTab}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            {activeTab === "general" && (
              <div className="space-y-5">
                <EvaluationSummaryPanel
                  assessment={assessment}
                  maturityModel={maturityModel}
                  evidenceCount={evidence.length}
                />
                <AgentReportPanel
                  assessment={assessment}
                  maturityModel={maturityModel}
                  evidence={evidence}
                  agentReport={agentReport}
                  error={agentError}
                  localAgentLoading={localAgentLoading}
                  onError={setAgentError}
                  onRunLocalAgent={handleRunLocalAgent}
                  onImport={(report, formattedInsight) => {
                    setAgentReport(report);
                    setFinalRemarks(formattedInsight);
                  }}
                />
              </div>
            )}

            {currentDimension && (
              <DimensionReviewTab
                dimension={currentDimension}
                reviews={reviews}
                maturityLevels={maturityLevels}
                scoreOptions={scoreOptions}
                onReviewChange={handleReviewChange}
                onDownloadEvidence={handleDownloadEvidence}
              />
            )}

            {activeTab === "results" && (
              <EvaluationResultsTab
                assessment={assessment}
                maturityModel={maturityModel}
                questions={evaluationModel.questions}
                reviews={reviews}
                progress={progress}
                finalRemarks={finalRemarks}
                onFinalRemarksChange={setFinalRemarks}
              />
            )}
          </div>

          <EvaluationActionBar
            progress={progress}
            evidenceCount={evidence.length}
            saving={savingProgress}
            submitting={submitting}
            sendingBack={sendingBack}
            deleting={isDeleting}
            canSubmit={canSubmit}
            canSendBack={canSendBack}
            canSave={evaluationModel.questions.length > 0}
            onSave={handleSaveProgress}
            onFinish={handleSubmitEvaluation}
            onSendBack={() => setShowSendBackModal(true)}
          />
        </div>
      </main>
    </div>
  );
}

function normalizeDraftStatus(
  status: string | undefined
): QuestionEvaluationStatus {
  return status === "ACCEPTED" ||
    status === "ADJUSTED" ||
    status === "FLAGGED"
    ? status
    : "FLAGGED";
}

function normalizeWarningSeverity(
  severity: string | undefined
): AgentReport["warnings"][number]["severity"] {
  return severity === "low" || severity === "medium" || severity === "high"
    ? severity
    : "medium";
}

function localAgentDraftToReport(
  draft: AgentEvaluationDraftResponse
): AgentReport {
  return {
    assessmentId: draft.assessmentId,
    summary: draft.summary || "Local agent beta draft generated.",
    source: "local-agent",
    generatedAt: draft.generatedAt,
    model: draft.model,
    confidence: draft.confidence,
    warnings: (draft.warnings || []).map((warning) => ({
      severity: normalizeWarningSeverity(warning.severity),
      questionId: warning.questionId ?? undefined,
      responseKey: warning.responseKey ?? undefined,
      message: warning.message,
      recommendation: warning.recommendation ?? undefined,
    })),
    inconsistencies: [],
    nextSteps: draft.nextSteps || [],
    documentSummaries: draft.documentSummaries || [],
    processingNotes: draft.processingNotes || [],
  };
}
