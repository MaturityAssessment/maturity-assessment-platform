"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssessmentResponse, MaturityModelSummary } from "@/api/types";
import apiClient from "@/api/axios";
import { Modal, PageLoading, SideNavbar } from "@/components";
import { useAuth } from "@/context";
import type { ModelDetails } from "../../dashboard/dashboardAssessments";
import AdminBreadcrumb from "../AdminBreadcrumb";
import AssessmentsPanel from "./AssessmentsPanel";

export default function AssessmentManagementPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [models, setModels] = useState<ModelDetails>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentToDelete, setAssessmentToDelete] =
    useState<AssessmentResponse | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<
    number | null
  >(null);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentResponse, modelResponse] = await Promise.all([
        apiClient.get<AssessmentResponse[]>("/api/v1/assessments/all"),
        apiClient.get<MaturityModelSummary[]>("/api/v1/maturity-model"),
      ]);
      setAssessments(assessmentResponse.data);
      setModels(
        Object.fromEntries(modelResponse.data.map((model) => [model.id, model]))
      );
      setError(null);
    } catch (loadError: any) {
      console.error("Error fetching assessments:", loadError);
      if (loadError.response?.status === 403) {
        setError(
          loadError.response?.data?.message ||
            "Access denied. Only administrators can manage assessments."
        );
        router.replace("/dashboard");
      } else {
        setError("Failed to load assessments. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated === null || (isAuthenticated && !user)) return;
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    if (user?.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    void fetchAssessments();
  }, [fetchAssessments, isAuthenticated, router, user]);

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete || deletingAssessmentId !== null) return;

    try {
      setDeletingAssessmentId(assessmentToDelete.id);
      setError(null);
      await apiClient.delete(`/api/v1/assessments/${assessmentToDelete.id}`);
      setAssessments((current) =>
        current.filter((assessment) => assessment.id !== assessmentToDelete.id)
      );
      setAssessmentToDelete(null);
    } catch (deleteError: any) {
      console.error("Error deleting assessment:", deleteError);
      setError(
        deleteError.response?.data?.message ||
          "Failed to delete the assessment. Please try again."
      );
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingAssessmentId !== null) return;
    setAssessmentToDelete(null);
  };

  if (
    isAuthenticated === null ||
    (isAuthenticated && !user) ||
    loading
  ) {
    return (
      <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <PageLoading message="Loading assessments..." />
        </main>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return <PageLoading message="Redirecting..." />;
  }

  return (
    <>
      <div className="flex min-h-screen bg-slate-50 [&>aside]:sticky [&>aside]:top-0">
        <SideNavbar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
            <header className="mb-8">
              <AdminBreadcrumb current="Assessment management" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Assessment management
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Review and manage individual and campaign assessments across
                the platform.
              </p>
            </header>

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <AssessmentsPanel
              assessments={assessments}
              models={models}
              deletingAssessmentId={deletingAssessmentId}
              onOpen={(assessmentId) =>
                router.push(`/assessment?draftId=${assessmentId}`)
              }
              onReview={(assessmentId) =>
                router.push(`/evaluate/${assessmentId}`)
              }
              onDelete={setAssessmentToDelete}
            />
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
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteAssessment()}
              disabled={deletingAssessmentId !== null}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-wait disabled:opacity-60"
            >
              {deletingAssessmentId !== null
                ? "Deleting..."
                : "Delete assessment"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-600">
          Are you sure you want to delete assessment #
          {assessmentToDelete?.id}? This action cannot be undone.
        </p>
        {assessmentToDelete?.campaignId != null && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This is a campaign assessment. Its participant will no longer have
            a submitted assessment attached to the campaign.
          </p>
        )}
      </Modal>
    </>
  );
}
