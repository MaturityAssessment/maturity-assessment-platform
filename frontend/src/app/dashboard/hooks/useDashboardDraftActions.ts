"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/api/axios";
import type { AssessmentResponse, MaturityModelSummary } from "@/api/types";
import {
  buildDraftSelection,
  DraftSelection,
} from "../../assessment/DraftSelectionModal";
import type { ModelDetails } from "../dashboardAssessments";

type UseDashboardDraftActionsOptions = {
  drafts: AssessmentResponse[];
  modelDetails: ModelDetails;
  removeAssessment: (assessmentId: number) => void;
};

export default function useDashboardDraftActions({
  drafts,
  modelDetails,
  removeAssessment,
}: UseDashboardDraftActionsOptions) {
  const router = useRouter();
  const [draftToDelete, setDraftToDelete] =
    useState<AssessmentResponse | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<number | null>(null);
  const [draftDeleteError, setDraftDeleteError] = useState<string | null>(null);
  const [draftSelection, setDraftSelection] =
    useState<DraftSelection | null>(null);
  const [draftSelectionModel, setDraftSelectionModel] =
    useState<MaturityModelSummary | null>(null);
  const [draftSelectionError, setDraftSelectionError] = useState<string | null>(
    null
  );
  const [draftSelectionAction, setDraftSelectionAction] = useState<
    number | "start-fresh" | null
  >(null);

  const openDraft = useCallback(
    (draft: AssessmentResponse) => {
      if (!draft.maturityModelId) return;

      const selectedModel = modelDetails[draft.maturityModelId];
      if (!selectedModel) {
        router.push(`/assessment?draftId=${draft.id}`);
        return;
      }

      const lineageRootId = selectedModel.baseModelId ?? selectedModel.id;
      const lineageModels = Object.values(modelDetails).filter(
        (model) => (model.baseModelId ?? model.id) === lineageRootId
      );
      const lineageModelIds = new Set(lineageModels.map((model) => model.id));
      const lineageDrafts = drafts.filter(
        (candidate) =>
          candidate.maturityModelId != null &&
          lineageModelIds.has(candidate.maturityModelId)
      );
      const activeModel = lineageModels.find((model) => model.isActive) ?? null;

      if (selectedModel.isActive && lineageDrafts.length <= 1) {
        router.push(`/assessment?draftId=${draft.id}`);
        return;
      }

      const selection = buildDraftSelection(
        lineageDrafts,
        activeModel?.id ?? -1
      );
      if (!selection) {
        router.push(`/assessment?draftId=${draft.id}`);
        return;
      }

      setDraftSelectionError(null);
      setDraftSelectionModel(activeModel ?? selectedModel);
      setDraftSelection(selection);
    },
    [drafts, modelDetails, router]
  );

  const openAssessment = useCallback(
    (assessment: AssessmentResponse) => {
      if (assessment.status === "DRAFT") {
        openDraft(assessment);
      } else if (assessment.status === "CHANGES_REQUESTED") {
        router.push(`/assessment?draftId=${assessment.id}`);
      } else if (
        assessment.status === "COMPLETED" ||
        assessment.isCompleted
      ) {
        router.push(`/assessment?draftId=${assessment.id}`);
      }
    },
    [openDraft, router]
  );

  const continueSelectedDraft = useCallback(
    (draft: AssessmentResponse) => {
      setDraftSelectionAction(draft.id);
      router.push(`/assessment?draftId=${draft.id}`);
    },
    [router]
  );

  const startNewFromSelection = useCallback(async () => {
    if (draftSelectionAction !== null) return;

    const currentDraft = draftSelection?.currentDraft;
    const activeModelId = draftSelectionModel?.isActive
      ? draftSelectionModel.id
      : null;
    setDraftSelectionAction("start-fresh");
    setDraftSelectionError(null);
    try {
      if (!activeModelId) {
        setDraftSelectionError(
          "A new assessment cannot be started because this model has no active version."
        );
        setDraftSelectionAction(null);
        return;
      }

      const response = currentDraft
        ? await apiClient.put<AssessmentResponse>(
            `/api/v1/assessments/drafts/${currentDraft.id}/reset`
          )
        : await apiClient.put<AssessmentResponse>(
            `/api/v1/assessments/drafts/by-model/${activeModelId}`
          );
      router.push(`/assessment?draftId=${response.data.id}`);
    } catch (actionError) {
      console.error("Error preparing a new assessment:", actionError);
      setDraftSelectionError(
        currentDraft
          ? "Could not clear the current draft. Its saved progress was kept unchanged."
          : "Could not start the new assessment. Please try again."
      );
      setDraftSelectionAction(null);
    }
  }, [
    draftSelection,
    draftSelectionAction,
    draftSelectionModel,
    router,
  ]);

  const closeDraftSelection = useCallback(() => {
    if (draftSelectionAction !== null) return;
    setDraftSelection(null);
    setDraftSelectionModel(null);
    setDraftSelectionError(null);
  }, [draftSelectionAction]);

  const requestDraftDeletion = useCallback((draft: AssessmentResponse) => {
    setDraftDeleteError(null);
    setDraftToDelete(draft);
  }, []);

  const closeDraftDeletion = useCallback(() => {
    if (deletingDraftId !== null) return;
    setDraftToDelete(null);
    setDraftDeleteError(null);
  }, [deletingDraftId]);

  const deleteDraft = useCallback(async () => {
    if (!draftToDelete || deletingDraftId !== null) return;

    setDeletingDraftId(draftToDelete.id);
    setDraftDeleteError(null);
    try {
      await apiClient.delete(`/api/v1/assessments/${draftToDelete.id}`);
      removeAssessment(draftToDelete.id);
      setDraftToDelete(null);
    } catch (deleteError) {
      console.error("Error deleting assessment draft:", deleteError);
      setDraftDeleteError("Could not delete this draft. Please try again.");
    } finally {
      setDeletingDraftId(null);
    }
  }, [deletingDraftId, draftToDelete, removeAssessment]);

  return {
    openDraft,
    openAssessment,
    draftToDelete,
    deletingDraftId,
    draftDeleteError,
    requestDraftDeletion,
    closeDraftDeletion,
    deleteDraft,
    draftSelection,
    draftSelectionModel,
    draftSelectionError,
    draftSelectionAction,
    continueSelectedDraft,
    startNewFromSelection,
    closeDraftSelection,
  };
}
