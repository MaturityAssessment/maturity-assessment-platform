"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssessmentResponse, MaturityModelSummary } from "@/api/types";
import { Modal, SideNavbar } from "@/components";
import apiClient from "@/api/axios";
import type { ModelDetails } from "../dashboard/dashboardAssessments";
import {
  DashboardError,
  DashboardLoading,
} from "../dashboard/components/DashboardStates";
import EvaluationQueuePanel from "./EvaluationQueuePanel";

export default function Evaluate() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [models, setModels] = useState<ModelDetails>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<
    number | null
  >(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState<number | null>(
    null
  );

  const fetchPendingAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentResponse, modelResponse] = await Promise.all([
        apiClient.get<AssessmentResponse[]>("/api/v1/assessments/pending"),
        apiClient.get<MaturityModelSummary[]>("/api/v1/maturity-model"),
      ]);
      setAssessments(assessmentResponse.data);
      setModels(
        Object.fromEntries(modelResponse.data.map((model) => [model.id, model]))
      );
      setError(null);
    } catch (loadError: any) {
      console.error("Error fetching pending assessments:", loadError);
      if (loadError.response?.status === 403) {
        setError(
          loadError.response?.data?.message ||
            "Only curators and administrators can evaluate assessments."
        );
      } else {
        setError(
          "We could not load the evaluation queue. Please try again later."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPendingAssessments();
  }, [fetchPendingAssessments]);

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete || deletingAssessmentId !== null) return;

    try {
      setDeletingAssessmentId(assessmentToDelete);
      setDeleteError(null);
      await apiClient.delete(`/api/v1/assessments/${assessmentToDelete}`);
      setAssessments((current) =>
        current.filter((assessment) => assessment.id !== assessmentToDelete)
      );
      setAssessmentToDelete(null);
    } catch (deleteFailure: any) {
      console.error("Error deleting assessment:", deleteFailure);
      setDeleteError(
        deleteFailure.response?.data?.message ||
          "Failed to delete the assessment. Please try again."
      );
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingAssessmentId !== null) return;
    setAssessmentToDelete(null);
    setDeleteError(null);
  };

  return (
    <>
      <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <header className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                Review workspace
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Evaluate assessments
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Review submitted assessments, validate their answers, and
                finalize their results.
              </p>
            </header>

            {loading ? (
              <DashboardLoading />
            ) : error ? (
              <DashboardError
                message={error}
                onRetry={fetchPendingAssessments}
              />
            ) : (
              <EvaluationQueuePanel
                assessments={assessments}
                models={models}
                deletingAssessmentId={deletingAssessmentId}
                onReview={(assessmentId) =>
                  router.push(`/evaluate/${assessmentId}`)
                }
                onDelete={(assessmentId) => {
                  setDeleteError(null);
                  setAssessmentToDelete(assessmentId);
                }}
              />
            )}
          </div>
        </main>
      </div>

      <Modal
        isOpen={assessmentToDelete !== null}
        onClose={closeDeleteModal}
        title="Delete assessment"
        maxWidth="md"
        closeButtonDisabled={deletingAssessmentId !== null}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deletingAssessmentId !== null}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteAssessment()}
              disabled={deletingAssessmentId !== null}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
            >
              {deletingAssessmentId !== null ? "Deleting..." : "Delete"}
            </button>
          </div>
        }
      >
        <p className="text-slate-700">
          Are you sure you want to delete this assessment? This action cannot
          be undone.
        </p>
        {deleteError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {deleteError}
          </p>
        )}
      </Modal>
    </>
  );
}
