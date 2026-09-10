import { PlusIcon } from "@heroicons/react/24/outline";
import type {
  MaturityModelEditorDocument,
  ModelEditorDimension,
} from "@/api/types";
import {
  CodeField,
  inputClass,
  labelClass,
} from "../../components/FormFields";
import { codeOrdinal, suggestCode } from "../../model/editorDocument";
import type {
  Selection,
  StructureEditorCommands,
} from "../../model/editorTypes";
import ChildItemList from "./ChildItemList";
import ItemHeader from "./ItemHeader";
import { TEXT_LIMITS } from "@/config/textLimits";
import AggregationRuleField from "../../components/AggregationRuleField";
import MappingRuleField from "../../components/MappingRuleField";
import GatingRuleField from "../../components/GatingRuleField";

export default function DimensionEditor({
  document,
  dimension,
  onSelect,
  commands,
}: {
  document: MaturityModelEditorDocument;
  dimension: ModelEditorDimension;
  onSelect: (selection: Selection) => void;
  commands: StructureEditorCommands;
}) {
  const dimensionIndex = document.dimensions.findIndex(
    (candidate) => candidate.clientKey === dimension.clientKey
  );
  const update = (next: ModelEditorDimension) =>
    commands.updateDimension(dimension.clientKey, next);

  return (
    <>
      <ItemHeader
        kind="Dimension"
        code={dimension.code}
        canDelete={document.dimensions.length > 1}
        onMoveUp={() => commands.moveDimension(dimension.clientKey, -1)}
        onMoveDown={() => commands.moveDimension(dimension.clientKey, 1)}
        onDelete={() => {
          if (!window.confirm("Delete this dimension and all of its content?"))
            return;
          commands.deleteDimension(dimension.clientKey);
        }}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClass}>
          Name *
          <input
            className={inputClass}
            value={dimension.name}
            maxLength={TEXT_LIMITS.name}
            onChange={(event) =>
              update({
                ...dimension,
                name: event.target.value,
                code:
                  dimension.codeLocked || dimension.name
                    ? dimension.code
                    : suggestCode(
                        "D",
                        codeOrdinal(
                          dimension.code,
                          "D",
                          dimensionIndex + 1
                        ),
                        event.target.value
                      ),
              })
            }
          />
        </label>
        <CodeField
          id={`dimension-${dimension.clientKey}-code`}
          value={dimension.code}
          locked={dimension.codeLocked}
          onChange={(code) => update({ ...dimension, code })}
        />
        <label className={`${labelClass} md:col-span-2`}>
          Description
          <textarea
            rows={4}
            className={inputClass}
            value={dimension.description}
            maxLength={TEXT_LIMITS.description}
            onChange={(event) =>
              update({ ...dimension, description: event.target.value })
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
            value={dimension.weight}
            onChange={(event) =>
              update({
                ...dimension,
                weight: Number(event.target.value) || 1,
              })
            }
          />
        </label>
        <AggregationRuleField
          id={`dimension-${dimension.clientKey}-aggregation-rule`}
          label="Module aggregation rule"
          value={dimension.aggregationRule}
          onChange={(aggregationRule) =>
            update({ ...dimension, aggregationRule })
          }
        />
        <GatingRuleField
          idPrefix={`dimension-${dimension.clientKey}`}
          childLabel="Modules"
          childOptions={dimension.modules.map((module) => ({
            code: module.code,
            name: module.name,
          }))}
          value={dimension.gatingRules}
          onChange={(gatingRules) => update({ ...dimension, gatingRules })}
        />
        <MappingRuleField
          idPrefix={`dimension-${dimension.clientKey}`}
          levels={document.levels}
          value={dimension.mappingRules}
          onChange={(mappingRules) => update({ ...dimension, mappingRules })}
        />
      </div>
      <div className="mt-8 flex items-start justify-between gap-4 border-t border-gray-100 pt-5">
        <ChildItemList
          title="Modules"
          parentCode={dimension.code}
          itemType="module"
          items={dimension.modules}
          onSelect={onSelect}
          onMove={(moduleKey, direction) =>
            commands.moveModule(dimension.clientKey, moduleKey, direction)
          }
          onReorder={(activeKey, overKey) =>
            commands.reorderModule(
              dimension.clientKey,
              activeKey,
              overKey
            )
          }
        />
        <button
          type="button"
          onClick={() => commands.addModule(dimension.clientKey)}
          className="inline-flex shrink-0 items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add module
        </button>
      </div>
    </>
  );
}
