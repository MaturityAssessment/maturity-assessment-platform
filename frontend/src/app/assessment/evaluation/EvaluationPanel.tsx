"use client";

import type { AssessmentResponse, MaturityModel } from "@/api/types";
import { TEXT_LIMITS } from "@/config/textLimits";
import AssessmentSaveIndicator from "../AssessmentSaveIndicator";
import AgentReportPanel from "./AgentReportPanel";
import EvaluationReviewQueue from "./EvaluationReviewQueue";
import EvaluationSummaryPanel from "./EvaluationSummaryPanel";
import type { EvaluationController } from "./useEvaluation";

type EvaluationPanelProps = {
  assessment: AssessmentResponse;
  model: MaturityModel;
  evaluation: EvaluationController;
  onQuestion: (responseKey: string) => void;
};

export default function EvaluationPanel({
  assessment,
  model,
  evaluation,
  onQuestion,
}: EvaluationPanelProps) {

  return (
    <section
      id="assessment-panel-evaluation"
      role="tabpanel"
      aria-labelledby="assessment-tab-evaluation"
      className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Evaluation</h1>
          <p className="mt-1 text-sm text-slate-500">Review responses, resolve questions and complete your evaluation.</p>
        </div>
        {evaluation.editable ? (
          <AssessmentSaveIndicator
            status={evaluation.status}
            error={evaluation.error}
            onRetry={() => { void evaluation.flush(); }}
          />
        ) : (
          <p className="text-sm text-slate-600">
            Read-only · {assessment.status?.replaceAll("_", " ")}
          </p>
        )}
        <button
          type="button"
          disabled={evaluation.busy || evaluation.agentLoading}
          onClick={() => void evaluation.remove()}
          className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          Delete assessment
        </button>
      </div>
      {evaluation.error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {evaluation.error}
        </p>
      )}
      {evaluation.notice && (
        <p role="status" className="rounded bg-blue-50 p-3 text-blue-800">
          {evaluation.notice}
        </p>
      )}
      <EvaluationSummaryPanel
        assessment={assessment}
        maturityModel={model}
        evidenceCount={evaluation.evidence.length}
      />
      <EvaluationReviewQueue model={model} evaluation={evaluation} onQuestion={onQuestion} />
      {evaluation.editable && (
        <fieldset disabled={evaluation.busy}>
          <AgentReportPanel
            assessment={assessment}
            maturityModel={model}
            evidence={evaluation.evidence}
            agentReport={evaluation.agentReport}
            error={null}
            localAgentLoading={evaluation.agentLoading}
            onImport={evaluation.importReport}
            onRunLocalAgent={() => void evaluation.runAgent()}
            onError={evaluation.setError}
          />
        </fieldset>
      )}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="evaluation-final-remarks" className="font-semibold">Final remarks</label>
        <p className="mt-1 text-sm text-slate-500">Summarize your findings and any recommendations for the respondent.</p>
        <textarea
          id="evaluation-final-remarks"
          value={evaluation.finalRemarks}
          onChange={event => evaluation.updateRemarks(event.target.value)}
          readOnly={!evaluation.editable || evaluation.busy}
          maxLength={TEXT_LIMITS.description}
          rows={5}
          placeholder="Add your overall assessment…"
          className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </section>
      {evaluation.editable && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <button
            type="button"
            disabled={!evaluation.canFinish || evaluation.busy || evaluation.agentLoading}
            onClick={() => void evaluation.transition("finish")}
            className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Finish evaluation
          </button>
          <button
            type="button"
            disabled={!evaluation.canSendBack || evaluation.busy || evaluation.agentLoading}
            onClick={() => void evaluation.transition("send-back")}
            className="rounded border border-red-200 px-4 py-2 font-semibold text-red-700 disabled:opacity-50"
          >
            Request changes
          </button>
          {!evaluation.canFinish && (
            <p className="w-full text-sm text-slate-600">
              Complete all statuses, required scores and notes, and resolve flagged questions
              or request changes before finishing.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
