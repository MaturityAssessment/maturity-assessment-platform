import { useState } from "react";
import { Bars3Icon, PlusIcon } from "@heroicons/react/24/outline";
import type {
  MaturityModelEditorDocument,
  ModelEditorModule,
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import {
  CodeField,
  inputClass,
  labelClass,
} from "../../components/FormFields";
import { codeOrdinal, suggestCode } from "../../model/editorDocument";
import type { StructureEditorCommands } from "../../model/editorTypes";
import ItemHeader from "./ItemHeader";
import QuestionEditor from "./QuestionEditor";
import QuestionReorderList from "./QuestionReorderList";
import { TEXT_LIMITS } from "@/config/textLimits";
import AggregationRuleField from "../../components/AggregationRuleField";
import GatingRuleField from "../../components/GatingRuleField";

export default function PracticeEditor({
  document,
  module,
  practice,
  commands,
}: {
  document: MaturityModelEditorDocument;
  module: ModelEditorModule;
  practice: ModelEditorPractice;
  commands: StructureEditorCommands;
}) {
  const [reorderingQuestions, setReorderingQuestions] = useState(false);
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
  };

  return (
    <>
      <ItemHeader
        kind="Practice"
        code={practice.code}
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
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClass}>
          Name *
          <input
            className={inputClass}
            value={practice.name}
            maxLength={TEXT_LIMITS.name}
            onChange={(event) =>
              update({
                ...practice,
                name: event.target.value,
                code:
                  practice.codeLocked || practice.name
                    ? practice.code
                    : suggestCode(
                        "P",
                        codeOrdinal(
                          practice.code,
                          "P",
                          practiceIndex + 1
                        ),
                        event.target.value
                      ),
              })
            }
          />
        </label>
        <CodeField
          id={`practice-${practice.clientKey}-code`}
          value={practice.code}
          locked={practice.codeLocked}
          onChange={(code) => update({ ...practice, code })}
        />
        <label className={labelClass}>
          Description
          <textarea
            rows={3}
            className={inputClass}
            value={practice.description}
            maxLength={TEXT_LIMITS.description}
            onChange={(event) =>
              update({ ...practice, description: event.target.value })
            }
          />
        </label>
        <label className={labelClass}>
          Weight
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={inputClass}
            value={practice.weight}
            onChange={(event) =>
              update({
                ...practice,
                weight: Number(event.target.value) || 1,
              })
            }
          />
        </label>
        <AggregationRuleField
          id={`practice-${practice.clientKey}-aggregation-rule`}
          label="Question aggregation rule"
          value={practice.aggregationRule}
          onChange={(aggregationRule) =>
            update({ ...practice, aggregationRule })
          }
        />
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
      </div>

      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-950">Questions</h3>
            <p className="text-sm text-gray-500">
              {reorderingQuestions
                ? "Drag the compact rows into the order respondents should see."
                : "Dependencies can only target boolean questions in this practice."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setReorderingQuestions((value) => !value)}
              className={`inline-flex items-center rounded-md border px-3 py-2 text-sm font-semibold transition ${
                reorderingQuestions
                  ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Bars3Icon className="mr-1.5 h-4 w-4" />
              {reorderingQuestions ? "Done reordering" : "Reorder questions"}
            </button>
            {!reorderingQuestions && (
              <button
                type="button"
                onClick={() => commands.addQuestion(practice.clientKey)}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Add question
              </button>
            )}
          </div>
        </div>
        {reorderingQuestions ? (
          <QuestionReorderList
            questions={practice.questions}
            onReorder={(activeKey, overKey) =>
              commands.reorderQuestion(
                practice.clientKey,
                activeKey,
                overKey
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {practice.questions.map((question, questionIndex) => (
              <QuestionEditor
                key={question.clientKey}
                question={question}
                questionIndex={questionIndex}
                practice={practice}
                maxLevel={document.levels.length}
                onChange={(next) =>
                  commands.updateQuestion(
                    practice.clientKey,
                    question.clientKey,
                    next
                  )
                }
                onMove={(direction) =>
                  commands.moveQuestion(
                    practice.clientKey,
                    question.clientKey,
                    direction
                  )
                }
                onDelete={() => deleteQuestion(question)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
