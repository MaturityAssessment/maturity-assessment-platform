"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/api/axios";
import type { AssessmentResponse, MaturityModelSummary } from "@/api/types";
import {
  buildDraftSelection,
  type DraftSelection,
} from "../assessment/DraftSelectionModal";

export default function useModelAssessmentStart() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] =
    useState<MaturityModelSummary | null>(null);
  const [selection, setSelection] = useState<DraftSelection | null>(null);
  const [checkingModelId, setCheckingModelId] = useState<number | null>(null);
  const [actionInProgress, setActionInProgress] = useState<
    number | "start-fresh" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const ensureAndOpenDraft = useCallback(
    async (modelId: number) => {
      const response = await apiClient.put<AssessmentResponse>(
        `/api/v1/assessments/drafts/by-model/${modelId}`
      );
      router.push(`/assessment?draftId=${response.data.id}`);
    },
    [router]
  );

  const startAssessment = useCallback(
    async (model: MaturityModelSummary) => {
      if (!model.isActive || checkingModelId !== null) return;

      setCheckingModelId(model.id);
      setError(null);
      try {
        const response = await apiClient.get<AssessmentResponse[]>(
          `/api/v1/assessments/drafts/by-model-lineage/${model.id}`
        );
        const nextSelection = buildDraftSelection(response.data, model.id);

        if (!nextSelection) {
          await ensureAndOpenDraft(model.id);
          return;
        }

        setSelectedModel(model);
        setSelection(nextSelection);
      } catch (startError) {
        console.error("Error checking assessment drafts:", startError);
        setError(
          "Could not check for saved drafts. Please try starting the assessment again."
        );
      } finally {
        setCheckingModelId(null);
      }
    },
    [checkingModelId, ensureAndOpenDraft]
  );

  const continueDraft = useCallback(
    (draft: AssessmentResponse) => {
      setActionInProgress(draft.id);
      router.push(`/assessment?draftId=${draft.id}`);
    },
    [router]
  );

  const startNew = useCallback(async () => {
    if (!selectedModel || actionInProgress !== null) return;

    const currentDraft = selection?.currentDraft;
    setActionInProgress("start-fresh");
    setError(null);
    try {
      const response = currentDraft
        ? await apiClient.put<AssessmentResponse>(
            `/api/v1/assessments/drafts/${currentDraft.id}/reset`
          )
        : await apiClient.put<AssessmentResponse>(
            `/api/v1/assessments/drafts/by-model/${selectedModel.id}`
          );
      router.push(`/assessment?draftId=${response.data.id}`);
    } catch (startError) {
      console.error("Error preparing a new assessment:", startError);
      setError(
        currentDraft
          ? "Could not clear the current draft. Its saved progress was kept unchanged."
          : "Could not start the new assessment. Please try again."
      );
      setActionInProgress(null);
    }
  }, [actionInProgress, router, selectedModel, selection]);

  const closeSelection = useCallback(() => {
    if (actionInProgress !== null) return;
    setSelectedModel(null);
    setSelection(null);
    setError(null);
  }, [actionInProgress]);

  return {
    selectedModel,
    selection,
    checkingModelId,
    actionInProgress,
    error,
    startAssessment,
    continueDraft,
    startNew,
    closeSelection,
  };
}
