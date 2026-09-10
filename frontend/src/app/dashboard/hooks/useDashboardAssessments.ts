"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentResponse, modelResponse] = await Promise.all([
        apiClient.get<AssessmentResponse[]>("/api/v1/assessments"),
        apiClient.get<MaturityModelSummary[]>("/api/v1/maturity-model"),
      ]);

      setAssessments(assessmentResponse.data);
      setModelDetails(
        Object.fromEntries(modelResponse.data.map((model) => [model.id, model]))
      );
      setError(null);
    } catch (loadError) {
      console.error("Error loading dashboard:", loadError);
      setError("We could not load your assessments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

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
    retry: loadAssessments,
    removeAssessment,
  };
}
