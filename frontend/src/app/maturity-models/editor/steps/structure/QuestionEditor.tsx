import { useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type {
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import {
  CodeField,
  inputClass,
  labelClass,
} from "../../components/FormFields";
import { codeOrdinal, suggestCode } from "../../model/editorDocument";
import { changeQuestionType } from "../../model/editorMutations";
import { dependencyWouldCycle } from "../../model/editorValidation";
import QuestionTypeFields, {
  ScaleConfigurationFields,
} from "./QuestionTypeFields";
import { TEXT_LIMITS } from "@/config/textLimits";

export default function QuestionEditor({
  question,
  questionIndex,
  practice,
  maxLevel,
  onChange,
  onMove,
  onDelete,
}: {
  question: ModelEditorQuestion;
  questionIndex: number;
  practice: ModelEditorPractice;
  maxLevel: number;
  onChange: (question: ModelEditorQuestion) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const evidenceOnly = question.type === "evidence";
  const dependencyCandidates = practice.questions.filter(
    (candidate) =>
      candidate.clientKey !== question.clientKey &&
      candidate.type === "boolean" &&
      !dependencyWouldCycle(practice, question.code, candidate.code)
  );
  const contentId = `question-${question.clientKey}-editor`;

  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50/70">
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={`mt-0.5 h-4 w-4 shrink-0 text-gray-500 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">
              {question.text || `Question ${questionIndex + 1}`}
            </span>
            <span className="mt-1 block font-mono text-xs text-gray-500">
              {question.code} · {question.type}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onMove(-1)}
          aria-label="Move question up"
          className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-700"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          aria-label="Move question down"
          className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-700"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={practice.questions.length <= 1}
          aria-label="Delete question"
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div
          id={contentId}
          aria-hidden={!expanded}
          inert={!expanded}
          className="min-h-0 overflow-hidden"
        >
          <div className="grid gap-4 border-t border-gray-200 bg-white p-4 md:grid-cols-2">
            <label className={`${labelClass} md:col-span-2`}>
              {evidenceOnly ? "Evidence request" : "Question text"} *
              <textarea
                id={`question-${question.clientKey}-text`}
                rows={2}
                className={inputClass}
                value={question.text}
                maxLength={TEXT_LIMITS.questionText}
                onChange={(event) =>
                  onChange({
                    ...question,
                    text: event.target.value,
                    code:
                      question.codeLocked || question.text
                        ? question.code
                        : suggestCode(
                            "Q",
                            codeOrdinal(
                              question.code,
                              "Q",
                              questionIndex + 1
                            ),
                            event.target.value
                          ),
                  })
                }
              />
            </label>
            <CodeField
              id={`question-${question.clientKey}-code`}
              value={question.code}
              locked={question.codeLocked}
              onChange={(code) => onChange({ ...question, code })}
            />
            <label className={labelClass}>
              Answer type
              <select
                className={inputClass}
                value={question.type}
                onChange={(event) =>
                  onChange(
                    changeQuestionType(
                      question,
                      event.target.value as ModelEditorQuestion["type"],
                      maxLevel
                    )
                  )
                }
              >
                <option value="boolean">Yes / No</option>
                <option value="likert">Scale</option>
                <option value="multiple_choice">Multiple choice</option>
                <option value="numeric">Numeric</option>
                <option value="percentage">Percentage</option>
                <option value="open_answer">Open answer</option>
                <option value="evidence">Require evidence</option>
              </select>
            </label>
            {evidenceOnly ? (
              <div
                className={`${labelClass} rounded-md border border-indigo-100 bg-indigo-50 p-3`}
              >
                Evidence-only item
                <span className="font-normal leading-5 text-indigo-700">
                  The respondent can provide files or secure links. This item
                  does not affect the maturity score.
                </span>
              </div>
            ) : (
              <label className={labelClass}>
                Weight
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputClass}
                  value={question.weight}
                  onChange={(event) =>
                    onChange({
                      ...question,
                      weight: Number(event.target.value) || 1,
                    })
                  }
                />
              </label>
            )}
            <label className={labelClass}>
              Depends on
              <select
                className={inputClass}
                value={question.dependsOnQuestionCode ?? ""}
                onChange={(event) =>
                  onChange({
                    ...question,
                    dependsOnQuestionCode: event.target.value || undefined,
                  })
                }
              >
                <option value="">No dependency</option>
                {dependencyCandidates.map((candidate) => (
                  <option key={candidate.clientKey} value={candidate.code}>
                    {candidate.code} — {candidate.text || "Untitled question"}
                  </option>
                ))}
              </select>
            </label>
            <ScaleConfigurationFields
              question={question}
              maxLevel={maxLevel}
              onChange={onChange}
            />
            <label className={`${labelClass} md:col-span-2`}>
              Guidance
              <textarea
                rows={2}
                className={inputClass}
                value={question.help}
                maxLength={TEXT_LIMITS.shortGuidance}
                onChange={(event) =>
                  onChange({ ...question, help: event.target.value })
                }
              />
            </label>
            <QuestionTypeFields
              question={question}
              maxLevel={maxLevel}
              onChange={onChange}
            />
            {!evidenceOnly && (
              <div className="flex flex-wrap gap-5 md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(event) =>
                      onChange({ ...question, required: event.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600"
                  />
                  Required answer
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={question.requiresEvidence}
                    onChange={(event) =>
                      onChange({
                        ...question,
                        requiresEvidence: event.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-blue-600"
                  />
                  Requires evidence
                </label>
              </div>
            )}
            {evidenceOnly && (
              <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(event) =>
                    onChange({ ...question, required: event.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600"
                />
                Evidence is required
              </label>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
