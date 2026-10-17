import WeightInput from "../../components/WeightInput";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import type {
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import {
  CodeField,
  inputClass,
  labelClass,
} from "../../components/FormFields";
import { suggestCode } from "../../model/editorDocument";
import { codePrefix } from "../../model/editorCodes";
import { changeQuestionType } from "../../model/editorMutations";
import QuestionDependencyField from "../../components/QuestionDependencyField";
import QuestionTypeFields, {
  ScaleConfigurationFields,
} from "./QuestionTypeFields";
import { TEXT_LIMITS } from "@/config/textLimits";

export default function QuestionEditor({
  question,
  issues = [],
  questionIndex,
  practice,
  maxLevel,
  onChange,
  onClose,
  onDelete,
}: {
  issues?: import("../../model/editorTypes").EditorIssue[];
  question: ModelEditorQuestion;
  questionIndex: number;
  practice: ModelEditorPractice;
  maxLevel: number;
  onChange: (question: ModelEditorQuestion) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/40" />
      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 sm:p-6">
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-950">Edit question {questionIndex + 1}</DialogTitle>
                <Description className="mt-1 text-sm text-gray-500">Changes are kept in the model draft. Save the model to persist them.</Description>
              </div>
              <button type="button" onClick={onClose} aria-label="Close question editor"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
            {issues.length > 0 && (
              <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2">
                <p className="font-semibold">This question needs attention</p>
                <ul className="mt-1 list-disc pl-5">{issues.map((issue) => <li key={issue.id}>{issue.message}</li>)}</ul>
              </div>
            )}
            <label className={`${labelClass} md:col-span-2`}>
              Question text *
              <textarea
                id={`question-${question.clientKey}-text`}
                rows={3}
                autoFocus
                aria-required="true"
                className={inputClass}
                value={question.text}
                maxLength={TEXT_LIMITS.questionText}
                onChange={(event) =>
                  onChange({
                    ...question,
                    text: event.target.value,
                    code:
                      question.codeLocked || question.text ||
                      question.code !== suggestCode("Q", questionIndex + 1, "Question")
                        ? question.code
                        : suggestCode(
                            "Q",
                            questionIndex + 1,
                            event.target.value
                          ),
                  })
                }
              />
            </label>
            <CodeField
              id={`question-${question.clientKey}-code`}
              value={question.code}
              prefix={codePrefix("Q", questionIndex + 1)}
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
                <option value="multiple_selection">Multiple Selection</option>
                <option value="open_answer">Open answer</option>
              </select>
            </label>
              <label className={labelClass}>
                Weight
                <WeightInput
                  key={question.clientKey}
                  id={`question-${question.clientKey}-weight`}
                  value={question.weight}
                  allowZero={!question.required}
                  onChange={(weight) => onChange({ ...question, weight })}
                />
              </label>

            <QuestionDependencyField question={question} practice={practice} onChange={onChange} />
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
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
              <button type="button" onClick={onDelete} disabled={practice.questions.length <= 1}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-30">
                <TrashIcon className="h-4 w-4" /> Delete question
              </button>
              <button type="button" onClick={onClose}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Done</button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
