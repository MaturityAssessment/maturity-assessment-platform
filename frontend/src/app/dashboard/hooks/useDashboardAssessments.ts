"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useFreshnessRefresh from "@/hooks/useFreshnessRefresh";
import apiClient from "@/api/axios";
import type { AssessmentResponse, MaturityModelSummary } from "@/api/types";
import {
  buildAssessmentView,
  ModelDetails,
  sortAssessments,
} from "../dashboardAssessments";

export default function useDashboardAssessments() {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [modelDetails, setModelDetails] = useState<ModelDetails>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const mounted = useRef(true);

  const loadAssessments = useCallback(async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      if (!silent) setLoading(true);
      const [assessmentResponse, modelResponse] = await Promise.all([
        apiClient.get<AssessmentResponse[]>("/api/v1/assessments"),
        silent ? Promise.resolve(null) : apiClient.get<MaturityModelSummary[]>("/api/v1/maturity-model"),
      ]);

      if (!mounted.current) return;
      setAssessments(assessmentResponse.data);
      if (modelResponse) setModelDetails(
        Object.fromEntries(modelResponse.data.map((model) => [model.id, model]))
      );
      setError(null);
      setRefreshError(null);
    } catch (loadError) {
      console.error("Error loading dashboard:", loadError);
      if (mounted.current) {
        if (silent) setRefreshError("Evidence freshness could not be refreshed. Values shown are from the last successful check.");
        else setError("We could not load your assessments. Please try again.");
      }
    } finally {
      loadingRef.current = false;
      if (mounted.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadAssessments();
    return () => { mounted.current = false; };
  }, [loadAssessments]);
  const nextRefreshAt = assessments.map(item => item.currentEvidenceFreshness?.nextRefreshAt).filter((date): date is string => Boolean(date)).sort()[0];
  useFreshnessRefresh(() => loadAssessments(true), nextRefreshAt, !loading);

  const removeAssessment = useCallback((assessmentId: number) => {
    setAssessments((current) =>
      current.filter((assessment) => assessment.id !== assessmentId)
    );
  }, []);

  const sortedAssessments = useMemo(
    () => sortAssessments(assessments),
    [assessments]
  );
  const assessmentViews = useMemo(() => {
    const now = Date.now();
    return sortedAssessments.map((assessment) =>
      buildAssessmentView(assessment, modelDetails, now)
    );
  }, [modelDetails, sortedAssessments]);
  const draftViews = useMemo(
    () => assessmentViews.filter((assessment) => assessment.isDraft),
    [assessmentViews]
  );
  const draftAssessments = useMemo(
    () => draftViews.map((view) => view.assessment),
    [draftViews]
  );

  return {
    assessments,
    modelDetails,
    assessmentViews,
    draftViews,
    draftAssessments,
    loading,
    error,
    retry: () => loadAssessments(),
    refreshError,
    removeAssessment,
  };
}
