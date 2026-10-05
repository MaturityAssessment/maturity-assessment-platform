import { useMemo, useState } from "react";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import type {
  ModelEditorModule,
  ModelEditorPractice,
  ModelEditorQuestion,
  MaturityModelEditorDocument,
} from "@/api/types";
import {
  CodeField,
  inputClass,
  labelClass,
} from "../../components/FormFields";
import { suggestCode } from "../../model/editorDocument";
import { codePrefix } from "../../model/editorCodes";
import type {
  Selection,
  StructureEditorCommands,
} from "../../model/editorTypes";
import { validateDocument } from "../../model/editorValidation";
import QuestionEditor from "./QuestionEditor";
import QuestionReorderList from "./QuestionReorderList";
import ItemHeader from "./ItemHeader";
import { TEXT_LIMITS } from "@/config/textLimits";
import AggregationRuleField from "../../components/AggregationRuleField";
import GatingRuleField from "../../components/GatingRuleField";
import ElementEditorTabs, { EditorSectionHeading } from "./ElementEditorTabs";

export default function PracticeEditor({
  document,
  module,
  practice,
  onSelect,
  commands,
}: {
  document: MaturityModelEditorDocument;
  module: ModelEditorModule;
  practice: ModelEditorPractice;
  onSelect: (selection: Selection) => void;
  commands: StructureEditorCommands;
}) {
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(practice.questions.length);
  if (questionCount !== practice.questions.length) {
    setQuestionCount(practice.questions.length);
    if (selectedQuestionKey === "__new__") {
      setSelectedQuestionKey(practice.questions.at(-1)?.clientKey ?? null);
    }
  }
  const questionIssues = useMemo(() => validateDocument(document).filter(
    (issue) => issue.selection?.key === practice.clientKey && issue.questionKey
  ), [document, practice.clientKey]);
  const selectedQuestion = practice.questions.find((question) => question.clientKey === selectedQuestionKey);
  const practiceIndex = module.practices.findIndex(
    (candidate) => candidate.clientKey === practice.clientKey
  );
  const update = (next: ModelEditorPractice) =>
    commands.updatePractice(module.clientKey, practice.clientKey, next);

  const deleteQuestion = (question: ModelEditorQuestion) => {
    const dependents = practice.questions.filter(
      (candidate) =>
        candidate.dependsOnQuestionCode?.toLowerCase() ===
        question.code.toLowerCase()
    );
    const referencedByGating = practice.gatingRules.some(
      (rule) =>
        rule.selection === "specificChild" &&
        rule.childCode?.toLowerCase() === question.code.toLowerCase()
    );
    if (
      (dependents.length || referencedByGating) &&
      !window.confirm(
        `Deleting this question will remove${
          dependents.length
            ? ` ${dependents.length} dependency link${dependents.length === 1 ? "" : "s"}`
            : ""
        }${dependents.length && referencedByGating ? " and" : ""}${
          referencedByGating ? " its specific-child gating rules" : ""
        }. Continue?`
      )
    ) {
      return;
    }
    commands.deleteQuestion(practice.clientKey, question.clientKey);
    setSelectedQuestionKey(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onSelect({ type: "module", key: module.clientKey })}
        className="mb-5 inline-flex max-w-full items-center gap-2 rounded text-sm font-medium text-gray-500 outline-none hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeftIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">Back to {module.name || "Untitled module"}</span>
      </button>
      <ItemHeader
        kind="Practice"
        code={practice.code}
        name={practice.name}
        context={`${practice.questions.length} question${practice.questions.length === 1 ? "" : "s"} in this practice`}
        canMoveUp={practiceIndex > 0}
        canMoveDown={practiceIndex < module.practices.length - 1}
        canDelete={module.practices.length > 1}
        onMoveUp={() =>
          commands.movePractice(module.clientKey, practice.clientKey, -1)
        }
        onMoveDown={() =>
          commands.movePractice(module.clientKey, practice.clientKey, 1)
        }
        onDelete={() => {
          const referenced = module.gatingRules.some(
            (rule) =>
              rule.selection === "specificChild" &&
              rule.childCode?.toLowerCase() === practice.code.toLowerCase()
          );
          const message = referenced
            ? "Delete this practice and all of its questions? Gating rules that reference it will also be removed."
            : "Delete this practice and all of its questions?";
          if (!window.confirm(message))
            return;
          commands.deletePractice(module.clientKey, practice.clientKey);
        }}
      />
      <ElementEditorTabs
        kind="Practice"
        tabs={[
          {
            id: "details",
            label: "Details",
            content: (
              <>
                <EditorSectionHeading
                  title="Practice details"
                  description="Give this practice a clear name and describe what it covers."
                />
                <div className="grid gap-6 rounded-xl border border-gray-200 bg-white p-4 @lg:p-5 @2xl:grid-cols-2">
                  <label className={labelClass}>
                    Name <span className="text-blue-600" aria-hidden="true">*</span>
                    <input
                      className={inputClass}
                      value={practice.name}
                      aria-required="true"
                      placeholder="e.g. Regular governance reviews"
                      maxLength={TEXT_LIMITS.name}
                      onChange={(event) =>
                        update({
                          ...practice,
                          name: event.target.value,
                          code:
                            practice.codeLocked || practice.name ||
                            practice.code !== suggestCode("P", practiceIndex + 1, "Practice")
                              ? practice.code
                              : suggestCode(
                                  "P",
                                  practiceIndex + 1,
                                  event.target.value
                                ),
                        })
                      }
                    />
                  </label>
                  <CodeField
                    id={`practice-${practice.clientKey}-code`}
                    value={practice.code}
                    prefix={codePrefix("P", practiceIndex + 1)}
                    locked={practice.codeLocked}
                    onChange={(code) => update({ ...practice, code })}
                  />
                  <label className={`${labelClass} @2xl:col-span-2`}>
                    <span className="flex items-center justify-between gap-3">
                      Description <span className="text-xs font-normal text-gray-400">Optional</span>
                    </span>
                    <textarea
                      rows={5}
                      className={`${inputClass} resize-y leading-6`}
                      value={practice.description}
                      maxLength={TEXT_LIMITS.description}
                      placeholder="Describe the purpose and scope of this practice."
                      onChange={(event) =>
                        update({ ...practice, description: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 @2xl:col-span-2">
                    <input type="checkbox" className="mt-1 rounded border-gray-300 text-blue-600"
                      checked={practice.requiresEvidence ?? false}
                      onChange={(event) => update({ ...practice, requiresEvidence: event.target.checked })} />
                    <span><span className="block font-semibold text-gray-900">Requires practice evidence</span>
                      <span className="mt-1 block text-gray-500">Ask respondents to provide evidence for this practice.</span>
                    </span>
                  </label>
                </div>
              </>
            ),
          },
          {
            id: "scoring",
            label: "Scoring",
            content: (
              <>
                <EditorSectionHeading
                  title="Score calculation"
                  description="Choose how question scores combine into the practice score."
                />
                <AggregationRuleField
                  cards
                  id={`practice-${practice.clientKey}-aggregation-rule`}
                  label="Question aggregation rule"
                  value={practice.aggregationRule}
                  onChange={(aggregationRule) =>
                    update({ ...practice, aggregationRule })
                  }
                />
                <label className="grid gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-5 @lg:grid-cols-[minmax(0,1fr)_8rem]">
                  <span className="text-sm font-semibold text-gray-900">Weight in the module</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={`${inputClass} @lg:col-start-2 @lg:row-span-2 @lg:row-start-1 @lg:self-center`}
                    value={practice.weight}
                    onChange={(event) =>
                      update({ ...practice, weight: Number(event.target.value) || 1 })
                    }
                  />
                  <span className="block text-sm font-normal leading-6 text-gray-500">
                    Relative importance when this module uses weighted aggregation.
                  </span>
                </label>
              </>
            ),
          },
          {
            id: "gating",
            label: "Gating rules",
            count: practice.gatingRules.length,
            content: (
              <GatingRuleField
                idPrefix={`practice-${practice.clientKey}`}
                childLabel="Questions"
                childOptions={practice.questions.map((question) => ({
                  code: question.code,
                  name: question.text,
                }))}
                value={practice.gatingRules}
                onChange={(gatingRules) => update({ ...practice, gatingRules })}
              />
            ),
          },
          {
            id: "questions",
            label: "Questions",
            issueCount: questionIssues.length,
            count: practice.questions.length,
            content: (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <EditorSectionHeading title="Questions" description="Open a question to edit it. Drag the rows or use the arrows to reorder." />
                  <button type="button" onClick={() => {
                    setSelectedQuestionKey("__new__");
                    commands.addQuestion(practice.clientKey);
                  }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500">
                    <PlusIcon className="h-4 w-4" /> Add question
                  </button>
                </div>
                <QuestionReorderList questions={practice.questions} issues={questionIssues}
                  onSelect={setSelectedQuestionKey}
                  onDelete={deleteQuestion}
                  onReorder={(activeKey, overKey) => commands.reorderQuestion(practice.clientKey, activeKey, overKey)} />
              </>
            ),
          },
        ]}
      />
      {selectedQuestion && (
        <QuestionEditor question={selectedQuestion} issues={questionIssues.filter((issue) => issue.questionKey === selectedQuestion.clientKey)}
          questionIndex={practice.questions.findIndex((question) => question.clientKey === selectedQuestion.clientKey)}
          practice={practice} maxLevel={document.levels.length}
          onClose={() => setSelectedQuestionKey(null)}
          onChange={(next) => commands.updateQuestion(practice.clientKey, selectedQuestion.clientKey, next)}
          onDelete={() => deleteQuestion(selectedQuestion)} />
      )}
    </>
  );
}
