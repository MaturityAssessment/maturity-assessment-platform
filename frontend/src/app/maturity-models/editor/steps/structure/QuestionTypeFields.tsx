import { TrashIcon } from "@heroicons/react/24/outline";
import type {
  ModelEditorQuestion,
  QuestionChoice,
} from "@/api/types";
import { inputClass, labelClass } from "../../components/FormFields";
import { TEXT_LIMITS } from "@/config/textLimits";

type QuestionTypeFieldProps = {
  question: ModelEditorQuestion;
  maxLevel: number;
  onChange: (question: ModelEditorQuestion) => void;
};

export function ScaleConfigurationFields({
  question,
  onChange,
}: QuestionTypeFieldProps) {
  if (question.type !== "likert") return null;

  return (
    <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
      <label className={labelClass}>
        Number of points
        <input
          type="number"
          min={2}
          max={10}
          className={inputClass}
          value={question.scalePointCount}
          onChange={(event) =>
            onChange({
              ...question,
              scalePointCount: Number(event.target.value),
            })
          }
        />
      </label>
      <label className={labelClass}>
        Endpoint representing the maximum
        <select
          className={inputClass}
          value={question.scaleHighPointIsMaximum ? "high" : "low"}
          onChange={(event) =>
            onChange({
              ...question,
              scaleHighPointIsMaximum: event.target.value === "high",
            })
          }
        >
          <option value="high">
            Highest point ({question.scalePointCount || "N"})
          </option>
          <option value="low">Lowest point (1)</option>
        </select>
      </label>
      <label className={labelClass}>
        Minimum endpoint tag
        <input
          className={inputClass}
          value={question.scaleMinLabel}
          maxLength={TEXT_LIMITS.scaleLabel}
          placeholder="Optional, e.g. Never"
          onChange={(event) =>
            onChange({ ...question, scaleMinLabel: event.target.value })
          }
        />
      </label>
      <label className={labelClass}>
        Maximum endpoint tag
        <input
          className={inputClass}
          value={question.scaleMaxLabel}
          maxLength={TEXT_LIMITS.scaleLabel}
          placeholder="Optional, e.g. Always"
          onChange={(event) =>
            onChange({ ...question, scaleMaxLabel: event.target.value })
          }
        />
      </label>
      <p className="text-xs text-gray-500 md:col-span-2">
        The selected endpoint represents the strongest result. Respondents see
        the point numbers and optional endpoint tags.
      </p>
    </div>
  );
}

export default function QuestionTypeFields({
  question,
  onChange,
}: QuestionTypeFieldProps) {
  const setChoices = (choices: QuestionChoice[]) =>
    onChange({ ...question, choices });

  if (question.type === "boolean") {
    return (
      <div className="md:col-span-2">
        <label className={labelClass}>
          Answer scored as correct
          <select
            className={inputClass}
            value={question.booleanCorrectAnswer ? "true" : "false"}
            onChange={(event) =>
              onChange({
                ...question,
                booleanCorrectAnswer: event.target.value === "true",
              })
            }
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          The selected answer is treated as correct when results are
          calculated. Respondents only see Yes/No.
        </p>
      </div>
    );
  }

  if (question.type === "multiple_choice") {
    return (
      <div className="md:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass}>Answer options</p>
          <button
            type="button"
            disabled={(question.choices?.length ?? 0) >= 100}
            onClick={() =>
              setChoices([
                ...(question.choices ?? []),
                {
                  label: "",
                  score: 0,
                },
              ])
            }
            className="text-sm font-medium text-blue-600 disabled:opacity-40"
          >
            Add option
          </button>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_7rem_auto] gap-2 px-1 text-xs font-medium text-gray-500">
            <span>Option label</span>
            <span>Score (0–1)</span>
            <span className="w-8" aria-hidden="true" />
          </div>
          {(question.choices ?? []).map((choice, choiceIndex) => (
            <div
              key={choiceIndex}
              className="grid grid-cols-[1fr_7rem_auto] gap-2"
            >
              <input
                aria-label={`Option ${choiceIndex + 1}`}
                className={inputClass.replace("mt-1 ", "")}
                value={choice.label}
                maxLength={TEXT_LIMITS.name}
                placeholder="Option label"
                onChange={(event) =>
                  setChoices(
                    (question.choices ?? []).map((item, index) =>
                      index === choiceIndex
                        ? { ...item, label: event.target.value }
                        : item
                    )
                  )
                }
              />
              <input
                type="number"
                min={0}
                max={1}
                step="0.01"
                aria-label={`Option ${choiceIndex + 1} normalized score`}
                className={inputClass.replace("mt-1 ", "")}
                value={choice.score}
                onChange={(event) =>
                  setChoices(
                    (question.choices ?? []).map((item, index) =>
                      index === choiceIndex
                        ? { ...item, score: Number(event.target.value) }
                        : item
                    )
                  )
                }
              />
              <button
                type="button"
                disabled={(question.choices?.length ?? 0) <= 1}
                onClick={() =>
                  setChoices(
                    (question.choices ?? []).filter(
                      (_, index) => index !== choiceIndex
                    )
                  )
                }
                className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Scores are internal values from 0 to 1. Respondents only see the
          option labels.
        </p>
      </div>
    );
  }

  if (question.type !== "numeric" && question.type !== "percentage") {
    return null;
  }

  return (
    <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
      <label className={labelClass}>
        Minimum allowed value
        <input
          type="number"
          step={1}
          className={inputClass}
          value={question.rangeMin}
          onChange={(event) =>
            onChange({ ...question, rangeMin: Number(event.target.value) })
          }
        />
      </label>
      <label className={labelClass}>
        Maximum allowed value
        <input
          type="number"
          step={1}
          className={inputClass}
          value={question.rangeMax}
          onChange={(event) =>
            onChange({ ...question, rangeMax: Number(event.target.value) })
          }
        />
      </label>
      <label className={labelClass}>
        Endpoint representing the maximum score
        <select
          className={inputClass}
          value={question.rangeHighValueIsMaximum ? "high" : "low"}
          onChange={(event) =>
            onChange({
              ...question,
              rangeHighValueIsMaximum: event.target.value === "high",
            })
          }
        >
          <option value="high">Maximum value ({question.rangeMax})</option>
          <option value="low">Minimum value ({question.rangeMin})</option>
        </select>
      </label>
      <p className="text-xs text-gray-500 md:col-span-3">
        Respondents enter whole numbers from {question.rangeMin} to {question.rangeMax}.
        Values are normalized linearly to an internal score from 0 to 1.
      </p>
    </div>
  );
}
