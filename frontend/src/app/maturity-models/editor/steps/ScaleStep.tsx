import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { MaturityModelEditorDocument } from "@/api/types";
import { inputClass, Panel } from "../components/FormFields";
import AggregationRuleField from "../components/AggregationRuleField";
import { TEXT_LIMITS } from "@/config/textLimits";
import { defaultMappingRules } from "../model/editorDocument";

export default function ScaleStep({
  document,
  onChange,
}: {
  document: MaturityModelEditorDocument;
  onChange: (document: MaturityModelEditorDocument) => void;
}) {
  const updateLevel = (
    index: number,
    field: "name" | "description",
    value: string
  ) => {
    onChange({
      ...document,
      levels: document.levels.map((level, levelIndex) =>
        levelIndex === index ? { ...level, [field]: value } : level
      ),
    });
  };

  const removeLevel = (removedIndex: number) => {
    const levels = document.levels
      .filter((_, index) => index !== removedIndex)
      .map((level, index) => ({ ...level, number: index + 1 }));
    onChange({
      ...document,
      levels,
      dimensions: document.dimensions.map((dimension) => ({
        ...dimension,
        mappingRules: dimension.mappingRules
          .filter((_, index) => index !== removedIndex)
          .map((rule, index) => ({
            levelNumber: index + 1,
            minimumScore: index === 0 ? 0 : rule.minimumScore,
          })),
      })),
    });
  };

  const addLevel = () => {
    const levelCount = document.levels.length + 1;
    onChange({
      ...document,
      levels: [
        ...document.levels,
        { number: levelCount, name: "", description: "" },
      ],
      dimensions: document.dimensions.map((dimension) => {
        const previous = dimension.mappingRules.at(-1)?.minimumScore ?? 0;
        const mappingRules = previous < 1
          ? [
              ...dimension.mappingRules,
              {
                levelNumber: levelCount,
                minimumScore: previous + (1 - previous) / 2,
              },
            ]
          : defaultMappingRules(levelCount);
        return { ...dimension, mappingRules };
      }),
    });
  };

  return (
    <div className="space-y-5">
      <Panel
        title="Maturity scale"
        description="Define the ordered outcomes used by scoring questions."
      >
        <div className="space-y-3">
          {document.levels.map((level, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[4rem_1fr_1.5fr_auto]"
            >
              <div className="flex h-10 items-center justify-center rounded-md bg-blue-50 text-sm font-semibold text-blue-700">
                {index + 1}
              </div>
              <input
                id={`level-${index}-name`}
                aria-label={`Level ${index + 1} name`}
                className={inputClass.replace("mt-1 ", "")}
                value={level.name}
                maxLength={TEXT_LIMITS.name}
                placeholder="Level name"
                onChange={(event) =>
                  updateLevel(index, "name", event.target.value)
                }
              />
              <input
                aria-label={`Level ${index + 1} description`}
                className={inputClass.replace("mt-1 ", "")}
                value={level.description ?? ""}
                maxLength={TEXT_LIMITS.description}
                placeholder="Optional description"
                onChange={(event) =>
                  updateLevel(index, "description", event.target.value)
                }
              />
              <button
                type="button"
                aria-label={`Remove level ${index + 1}`}
                disabled={document.levels.length <= 2}
                onClick={() => removeLevel(index)}
                className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={document.levels.length >= 12}
          onClick={addLevel}
          className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add level
        </button>
      </Panel>
      <Panel
        title="Overall aggregation"
        description="Choose how dimension scores combine into the final model score. Each structure item defines its own child aggregation rule."
      >
        <div className="max-w-md">
          <AggregationRuleField
            id="overall-aggregation-rule"
            label="Dimensions into the overall result"
            value={document.aggregationRule}
            onChange={(aggregationRule) =>
              onChange({ ...document, aggregationRule })
            }
          />
        </div>
      </Panel>
    </div>
  );
}
