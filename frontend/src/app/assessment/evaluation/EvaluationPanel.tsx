"use client";

import type { AssessmentResponse, MaturityModel } from "@/api/types";
import { TEXT_LIMITS } from "@/config/textLimits";
import AssessmentSaveIndicator from "../AssessmentSaveIndicator";
import AgentReportPanel from "./AgentReportPanel";
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
  const { progress, outstanding, questions } = evaluation;
  const outstandingKeys = new Set(outstanding.map(question => question.responseKey));

  return (
    <section
      id="assessment-panel-evaluation"
      role="tabpanel"
      aria-labelledby="assessment-tab-evaluation"
      className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Evaluation</h1>
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
          className="rounded border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
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
      <section className="space-y-3 rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Review progress</h2>
        <p>
          {progress.total - outstanding.length}/{progress.total} ready · {progress.flagged} flagged
          {" · "}{progress.missingManualScores} missing scores
          {" · "}{progress.missingNotes} missing notes
        </p>
        {outstanding[0] && (
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => onQuestion(outstanding[0].responseKey)}
          >
            Next question needing review
          </button>
        )}
        <div className="space-y-3">
          {model.dimensions.map(dimension => {
            const dimensionQuestions = questions.filter(question => question.dimensionId === dimension.id);
            if (!dimensionQuestions.length) return null;
            const remaining = dimensionQuestions.filter(question => outstandingKeys.has(question.responseKey));
            return (
              <div key={dimension.id}>
                <h3 className="font-medium">
                  {dimension.name} · {dimensionQuestions.length - remaining.length}/{dimensionQuestions.length} ready
                </h3>
                <ul className="mt-1 space-y-1">
                  {dimensionQuestions.map(question => (
                    <li key={question.responseKey}>
                      <button
                        type="button"
                        className="text-left text-sm text-indigo-700 underline"
                        onClick={() => onQuestion(question.responseKey)}
                      >
                        {question.moduleName} / {question.practiceName} · {question.question.code || question.question.text}
                        {" — "}{outstandingKeys.has(question.responseKey) ? "Needs review" : "Ready"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
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
      <section className="rounded-lg border bg-white p-5">
        <label htmlFor="evaluation-final-remarks" className="font-semibold">Final remarks</label>
        <textarea
          id="evaluation-final-remarks"
          value={evaluation.finalRemarks}
          onChange={event => evaluation.updateRemarks(event.target.value)}
          readOnly={!evaluation.editable || evaluation.busy}
          maxLength={TEXT_LIMITS.description}
          rows={5}
          className="mt-3 w-full rounded border border-slate-300 p-3"
        />
      </section>
      {evaluation.editable && (
        <div className="flex flex-wrap gap-3">
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
