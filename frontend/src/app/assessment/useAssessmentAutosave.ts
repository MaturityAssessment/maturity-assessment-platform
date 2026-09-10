"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  AssessmentData,
  AssessmentResponse,
  QuestionResponseRequest,
} from "@/api/types";
import apiClient from "@/api/axios";
import {
  buildEvidencePayload,
  validateEvidenceForSave,
  type AssessmentEvidenceByField,
} from "./assessmentEvidence";
import {
  cloneEvidenceSnapshot,
  reconcileSavedEvidence,
  SingleFlightAutosaveQueue,
  type AssessmentSaveStatus,
} from "./assessmentAutosave";

type LatestAssessmentState = {
  enabled: boolean;
  draftId: number | null;
  maturityModelId: number | null;
  revision: number;
  evidenceRevision: number;
  formData: AssessmentData;
  evidenceFiles: AssessmentEvidenceByField;
  respondentUpdatedResponseKeys: string[];
  campaignToken?: string | null;
  buildResponses: (
    formData: AssessmentData
  ) => Record<string, QuestionResponseRequest>;
};

type AssessmentAutosaveOptions = LatestAssessmentState & {
  setEvidenceFiles: Dispatch<
    SetStateAction<AssessmentEvidenceByField>
  >;
  debounceMs?: number;
};

export type AssessmentAutosaveController = {
  status: AssessmentSaveStatus;
  error: string | null;
  isDirty: boolean;
  retry: () => Promise<boolean>;
  flush: () => Promise<boolean>;
  getEvidenceFiles: () => AssessmentEvidenceByField;
};

export default function useAssessmentAutosave({
  enabled,
  draftId,
  maturityModelId,
  revision,
  evidenceRevision,
  formData,
  evidenceFiles,
  respondentUpdatedResponseKeys,
  campaignToken = null,
  buildResponses,
  setEvidenceFiles,
  debounceMs = 1_000,
}: AssessmentAutosaveOptions): AssessmentAutosaveController {
  const [status, setStatusState] =
    useState<AssessmentSaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [savedRevision, setSavedRevision] = useState(0);
  const latestRef = useRef<LatestAssessmentState>({
    enabled,
    draftId,
    maturityModelId,
    revision,
    evidenceRevision,
    formData,
    evidenceFiles,
    respondentUpdatedResponseKeys,
    campaignToken,
    buildResponses,
  });
  const setEvidenceFilesRef = useRef(setEvidenceFiles);
  const savedRevisionRef = useRef(0);
  const statusRef = useRef<AssessmentSaveStatus>("saved");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<SingleFlightAutosaveQueue | null>(null);
  const mountedRef = useRef(true);

  latestRef.current = {
    enabled,
    draftId,
    maturityModelId,
    revision,
    evidenceRevision,
    formData,
    evidenceFiles,
    respondentUpdatedResponseKeys,
    campaignToken,
    buildResponses,
  };
  setEvidenceFilesRef.current = setEvidenceFiles;

  const setStatus = useCallback(
    (nextStatus: AssessmentSaveStatus, nextError: string | null = null) => {
      statusRef.current = nextStatus;
      if (!mountedRef.current) return;
      setStatusState(nextStatus);
      setError(nextError);
    },
    []
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const saveLatestSnapshot = useCallback(async () => {
    const latest = latestRef.current;
    if (
      !latest.enabled ||
      !latest.draftId ||
      !latest.maturityModelId
    ) {
      throw new Error("This draft is not ready to save.");
    }

    const snapshot = {
      revision: latest.revision,
      evidenceRevision: latest.evidenceRevision,
      draftId: latest.draftId,
      maturityModelId: latest.maturityModelId,
      questionResponses: latest.buildResponses({ ...latest.formData }),
      evidenceFiles: cloneEvidenceSnapshot(latest.evidenceFiles),
      campaignToken: latest.campaignToken,
      respondentUpdatedResponseKeys:
        latest.respondentUpdatedResponseKeys,
    };
    const validationError = validateEvidenceForSave(
      snapshot.evidenceFiles
    );
    if (validationError) {
      throw new AutosaveValidationError(validationError);
    }

    const payload = new FormData();
    payload.append(
      "assessment",
      JSON.stringify({
        maturityModelId: snapshot.maturityModelId,
        questionResponses: snapshot.questionResponses,
        respondentUpdatedResponseKeys:
          snapshot.respondentUpdatedResponseKeys,
      })
    );
    const { metadata, uploads } = buildEvidencePayload(
      snapshot.evidenceFiles
    );
    payload.append("evidenceMetadata", JSON.stringify(metadata));
    uploads.forEach(({ itemKey, file }) => {
      payload.append("evidenceFile", file);
      payload.append("evidenceFileKey", itemKey);
    });

    const response = await apiClient.put<AssessmentResponse>(
      snapshot.campaignToken
        ? "/api/v1/campaign-response"
        : `/api/v1/assessments/drafts/${snapshot.draftId}`,
      payload,
      snapshot.campaignToken
        ? { headers: { "X-Campaign-Token": snapshot.campaignToken } }
        : undefined
    );

    const current = latestRef.current;
    const reconciledEvidence = reconcileSavedEvidence(
      snapshot.evidenceFiles,
      current.evidenceFiles,
      response.data.evidence
    );
    latestRef.current = {
      ...current,
      evidenceFiles: reconciledEvidence,
    };
    if (mountedRef.current) {
      setEvidenceFilesRef.current(reconciledEvidence);
    }

    return snapshot.revision;
  }, []);

  if (!queueRef.current) {
    queueRef.current = new SingleFlightAutosaveQueue({
      getRevision: () => {
        const latest = latestRef.current;
        return latest.enabled &&
          latest.draftId &&
          latest.maturityModelId
          ? latest.revision
          : savedRevisionRef.current;
      },
      save: saveLatestSnapshot,
      onSaving: () => setStatus("saving"),
      onSaved: (committedRevision) => {
        savedRevisionRef.current = committedRevision;
        if (mountedRef.current) {
          setSavedRevision(committedRevision);
        }
        setStatus("saved");
      },
      onError: (saveError) => {
        if (!(saveError instanceof AutosaveValidationError)) {
          console.error("Error autosaving assessment:", saveError);
        }
        setStatus("error", getAutosaveErrorMessage(saveError));
      },
    });
  }

  const drain = useCallback((): Promise<boolean> => {
    clearTimer();
    const latest = latestRef.current;
    if (
      !latest.enabled ||
      !latest.draftId ||
      !latest.maturityModelId
    ) {
      return Promise.resolve(false);
    }
    return queueRef.current!.drain();
  }, [clearTimer]);

  const retry = useCallback(async () => {
    if (latestRef.current.revision <= savedRevisionRef.current) {
      setStatus("saved");
      return true;
    }
    setStatus("saving");
    return drain();
  }, [drain, setStatus]);

  const flush = useCallback(async () => {
    clearTimer();
    if (latestRef.current.revision <= savedRevisionRef.current) {
      setStatus("saved");
      return true;
    }
    setStatus("saving");
    return drain();
  }, [clearTimer, drain, setStatus]);

  const getEvidenceFiles = useCallback(
    () => latestRef.current.evidenceFiles,
    []
  );

  useEffect(() => {
    if (!enabled || revision <= savedRevisionRef.current) return;

    clearTimer();
    setStatus("saving");
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void drain();
    }, debounceMs);
    return clearTimer;
  }, [
    clearTimer,
    debounceMs,
    drain,
    enabled,
    evidenceRevision,
    revision,
    setStatus,
  ]);

  useEffect(() => {
    const handleOnline = () => {
      if (
        latestRef.current.revision <= savedRevisionRef.current
      ) return;

      void retry().then((saved) => {
        if (
          !saved &&
          navigator.onLine &&
          latestRef.current.revision > savedRevisionRef.current
        ) {
          void retry();
        }
      });
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [retry]);

  const isDirty = revision > savedRevision;
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        !dirtyRef.current &&
        statusRef.current !== "saving" &&
        statusRef.current !== "error"
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", warnBeforeUnload);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  return {
    status,
    error,
    isDirty,
    retry,
    flush,
    getEvidenceFiles,
  };
}

function getAutosaveErrorMessage(error: unknown) {
  if (error instanceof AutosaveValidationError) {
    return error.message;
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return "You are offline. Your changes have not been saved.";
  }

  const responseMessage = (
    error as {
      errorMessage?: unknown;
      response?: { data?: { message?: unknown } };
    }
  ).errorMessage;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  const bodyMessage = (
    error as { response?: { data?: { message?: unknown } } }
  ).response?.data?.message;
  return typeof bodyMessage === "string" && bodyMessage.trim()
    ? bodyMessage
    : "Could not save your changes. Please retry.";
}

class AutosaveValidationError extends Error {}
