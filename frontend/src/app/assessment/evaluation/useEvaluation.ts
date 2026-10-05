"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/api/axios";
import type { AgentEvaluationDraftResponse, AssessmentResponse, Evidence, MaturityModel } from "@/api/types";
import { buildEvaluationModel, calculateProgress, initialReviewDrafts } from "./evaluationModel";
import type { AgentReport, QuestionReviewDraft } from "./types";
import { SingleFlightAutosaveQueue } from "../assessmentAutosave";
import type { AssessmentSaveStatus } from "../assessmentAutosave";
import { mergeAgentReviews, reviewNeedsAttention } from "./evaluationState";

export default function useEvaluation(assessment: AssessmentResponse | null, model: MaturityModel | null, enabled: boolean, editable: boolean) {
  const router = useRouter();
  const evaluationModel = useMemo(() => assessment && model && enabled ? buildEvaluationModel(assessment, model, assessment.evidence || []) : null, [assessment, model, enabled]);
  const [reviews, setReviews] = useState<Record<string, QuestionReviewDraft>>({});
  const [finalRemarks, setRemarks] = useState("");
  const [status, setStatus] = useState<AssessmentSaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentReport, setAgentReport] = useState<AgentReport | null>(null);
  const [revision, setRevision] = useState(0);
  const latest = useRef({ reviews, finalRemarks, revision, editable, id: assessment?.id });
  const touched = useRef(new Set<string>());
  const remarksTouched = useRef(false);
  const queue = useRef<SingleFlightAutosaveQueue | null>(null);
  const initialized = useRef<number | null>(null);
  const session = useRef({ generation: 0 });
  const locked = useRef(false);
  latest.current = { reviews, finalRemarks, revision, editable, id: assessment?.id };

  useEffect(() => {
    if (!evaluationModel || !assessment || initialized.current === assessment.id) return;
    initialized.current = assessment.id;
    const generation = ++session.current.generation;
    const id = assessment.id;
    const initial = initialReviewDrafts(evaluationModel.questions, assessment);
    latest.current = { reviews: initial, finalRemarks: assessment.evaluatorInsight || "", revision: 0, editable, id };
    setReviews(initial);
    setRemarks(assessment.evaluatorInsight || "");
    setRevision(0);
    touched.current.clear();
    remarksTouched.current = false;
    setAgentReport(null);
    setError(null);
    setNotice(null);
    setStatus("saved");
    queue.current = new SingleFlightAutosaveQueue({
      getRevision: () => latest.current.revision,
      save: async (requestedRevision) => {
        const snapshot = latest.current;
        await apiClient.put(`/api/v1/assessments/${id}/evaluation/reviews`, {
          manualScores: {},
          questionEvaluations: Object.fromEntries(evaluationModel.questions.map(question => [question.responseKey, {
            questionId: question.questionId,
            ...snapshot.reviews[question.responseKey],
          }])),
          evaluatorInsight: snapshot.finalRemarks,
        });
        return requestedRevision;
      },
      onSaving: () => { if (session.current.generation === generation) { setStatus("saving"); setError(null); } },
      onSaved: saved => { if (session.current.generation === generation) setStatus(saved >= latest.current.revision ? "saved" : "saving"); },
      onError: err => { if (session.current.generation === generation) { setStatus("error"); setError(errorMessage(err, "Could not save evaluation. Retry before leaving.")); } },
    });
  }, [assessment, evaluationModel, editable]);

  const flush = async () => {
    if (!latest.current.editable) return true;
    return await queue.current?.drain() ?? true;
  };
  const isDirty = () => latest.current.revision > (queue.current?.getSavedRevision() ?? 0);
  useEffect(() => {
    if (!editable || revision === 0) return;
    const timer = setTimeout(() => { void flush(); }, 1000);
    return () => clearTimeout(timer);
  }, [revision, editable]);

  useEffect(() => {
    const lifecycle = session.current;
    const unload = (event: BeforeUnloadEvent) => {
      if (isDirty()) { event.preventDefault(); event.returnValue = ""; }
    };
    const leaveLink = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!isDirty() || !link || link.target === "_blank" || link.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname.startsWith("/assessment") && url.searchParams.get("draftId") === String(latest.current.id)) return;
      event.preventDefault();
      event.stopPropagation();
      void flush().then(saved => { if (saved) { if (url.origin === window.location.origin) router.push(url.pathname + url.search + url.hash); else window.location.assign(url.href); } });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", leaveLink, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", leaveLink, true); lifecycle.generation++; initialized.current = null; };
  }, [router]);

  const change = (nextReviews: Record<string, QuestionReviewDraft>, nextRemarks = latest.current.finalRemarks) => {
    if (!latest.current.editable || locked.current) return;
    const nextRevision = latest.current.revision + 1;
    latest.current = { ...latest.current, reviews: nextReviews, finalRemarks: nextRemarks, revision: nextRevision };
    setReviews(nextReviews); setRemarks(nextRemarks); setRevision(nextRevision); setStatus("saving");
  };
  const updateReview = (key: string, review: QuestionReviewDraft) => {
    touched.current.add(key);
    change({ ...latest.current.reviews, [key]: review });
  };
  const updateRemarks = (value: string) => { remarksTouched.current = true; change(latest.current.reviews, value); };
  const importReport = (report: AgentReport, remarks: string) => {
    if (!latest.current.editable || locked.current) return;
    setAgentReport(report);
    if (!remarksTouched.current && !latest.current.finalRemarks.trim()) change(latest.current.reviews, remarks);
  };
  const runAgent = async () => {
    if (!assessment || !editable || locked.current || agentLoading) return;
    const generation = session.current.generation;
    setAgentLoading(true); setError(null);
    try {
      const { data: draft } = await apiClient.post<AgentEvaluationDraftResponse>(`/api/v1/assessments/${assessment.id}/agent-evaluation/draft`);
      if (generation !== session.current.generation) return;
      if (Number(draft.assessmentId) !== assessment.id) throw new Error("Agent draft does not match this assessment.");
      change(mergeAgentReviews(latest.current.reviews, draft, touched.current),
        !remarksTouched.current && !latest.current.finalRemarks.trim() ? draft.finalRemarks?.trim() || draft.summary || "" : latest.current.finalRemarks);
      setAgentReport({
        assessmentId: draft.assessmentId, summary: draft.summary || "Agent draft generated.", source: "local-agent",
        generatedAt: draft.generatedAt, model: draft.model, confidence: draft.confidence,
        warnings: (draft.warnings || []).map(w => ({ ...w, severity: w.severity === "low" || w.severity === "high" ? w.severity : "medium", questionId: w.questionId ?? undefined, responseKey: w.responseKey ?? undefined, recommendation: w.recommendation ?? undefined })),
        inconsistencies: [], nextSteps: draft.nextSteps || [], documentSummaries: draft.documentSummaries || [], processingNotes: draft.processingNotes || [],
      });
      setNotice("Agent suggestions applied to untouched reviews. Check the suggestions before finishing.");
    } catch (err) { if (generation === session.current.generation) setError(errorMessage(err, "Could not generate an agent draft.")); }
    finally { if (generation === session.current.generation) setAgentLoading(false); }
  };
  const questions = evaluationModel?.questions || [];
  const progress = calculateProgress(questions, reviews);
  const canFinish = editable && !progress.missingStatus && !progress.missingManualScores && !progress.missingNotes && !progress.flagged;
  const canSendBack = editable && progress.flagged > 0 && questions.filter(q => reviews[q.responseKey]?.validationStatus === "FLAGGED").every(q => !!reviews[q.responseKey]?.reviewerNote.trim());
  const transition = async (action: "finish" | "send-back") => {
    if (locked.current || agentLoading || !(action === "finish" ? canFinish : canSendBack)) return;
    if (action === "send-back" && !window.confirm(`Request changes for ${progress.flagged} flagged question(s)? The respondent will receive your reviewer notes.`)) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      if (!await flush()) return;
      await apiClient.put(`/api/v1/assessments/${assessment?.id}/evaluation/${action}`, { evaluatorInsight: latest.current.finalRemarks });
      router.push("/evaluate");
    } catch (err) { setError(errorMessage(err, "Could not update assessment. Reload if its status has changed.")); }
    finally { locked.current = false; setBusy(false); }
  };
  const remove = async () => {
    if (locked.current || !enabled || !window.confirm("Delete this assessment? This cannot be undone.")) return;
    locked.current = true; setBusy(true);
    try { if (!await flush()) return; await apiClient.delete(`/api/v1/assessments/${assessment?.id}`); router.push("/evaluate"); }
    catch (err) { setError(errorMessage(err, "Could not delete assessment.")); }
    finally { locked.current = false; setBusy(false); }
  };
  const download = async (id: number, name?: string | null) => {
    try {
      const { data } = await apiClient.get(`/api/v1/evidence/${id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(data); const link = document.createElement("a");
      link.href = url; link.download = name?.trim() || `evidence-${id}`; link.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(errorMessage(err, "Could not download evidence.")); }
  };
  return { reviews, finalRemarks, progress, questions, evidence: assessment?.evidence || [] as Evidence[], status, error, notice, busy, agentLoading, agentReport,
    editable, canFinish, canSendBack, updateReview, updateRemarks, flush, runAgent, importReport, setError, transition, remove, download,
    outstanding: questions.filter(q => reviewNeedsAttention(q, reviews[q.responseKey])) };
}

export type EvaluationController = ReturnType<typeof useEvaluation>;
function errorMessage(error: unknown, fallback: string) {
  const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
  return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
}
