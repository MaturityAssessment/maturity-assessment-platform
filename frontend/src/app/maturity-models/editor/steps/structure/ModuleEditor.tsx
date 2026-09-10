import { PlusIcon } from "@heroicons/react/24/outline";
import type {
  ModelEditorDimension,
  ModelEditorModule,
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
import GatingRuleField from "../../components/GatingRuleField";

export default function ModuleEditor({
  dimension,
  module,
  onSelect,
  commands,
}: {
  dimension: ModelEditorDimension;
  module: ModelEditorModule;
  onSelect: (selection: Selection) => void;
  commands: StructureEditorCommands;
}) {
  const moduleIndex = dimension.modules.findIndex(
    (candidate) => candidate.clientKey === module.clientKey
  );
  const update = (next: ModelEditorModule) =>
    commands.updateModule(dimension.clientKey, module.clientKey, next);

  return (
    <>
      <ItemHeader
        kind="Module"
        code={module.code}
        canDelete={dimension.modules.length > 1}
        onMoveUp={() =>
          commands.moveModule(dimension.clientKey, module.clientKey, -1)
        }
        onMoveDown={() =>
          commands.moveModule(dimension.clientKey, module.clientKey, 1)
        }
        onDelete={() => {
          const referenced = dimension.gatingRules.some(
            (rule) =>
              rule.selection === "specificChild" &&
              rule.childCode?.toLowerCase() === module.code.toLowerCase()
          );
          const message = referenced
            ? "Delete this module and all of its practices? Gating rules that reference it will also be removed."
            : "Delete this module and all of its practices?";
          if (!window.confirm(message))
            return;
          commands.deleteModule(dimension.clientKey, module.clientKey);
        }}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClass}>
          Name *
          <input
            className={inputClass}
            value={module.name}
            maxLength={TEXT_LIMITS.name}
            onChange={(event) =>
              update({
                ...module,
                name: event.target.value,
                code:
                  module.codeLocked || module.name
                    ? module.code
                    : suggestCode(
                        "M",
                        codeOrdinal(module.code, "M", moduleIndex + 1),
                        event.target.value
                      ),
              })
            }
          />
        </label>
        <CodeField
          id={`module-${module.clientKey}-code`}
          value={module.code}
          locked={module.codeLocked}
          onChange={(code) => update({ ...module, code })}
        />
        <label className={`${labelClass} md:col-span-2`}>
          Description
          <textarea
            rows={3}
            className={inputClass}
            value={module.description}
            maxLength={TEXT_LIMITS.description}
            onChange={(event) =>
              update({ ...module, description: event.target.value })
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
            value={module.weight}
            onChange={(event) =>
              update({ ...module, weight: Number(event.target.value) || 1 })
            }
          />
        </label>
        <AggregationRuleField
          id={`module-${module.clientKey}-aggregation-rule`}
          label="Practice aggregation rule"
          value={module.aggregationRule}
          onChange={(aggregationRule) =>
            update({ ...module, aggregationRule })
          }
        />
        <GatingRuleField
          idPrefix={`module-${module.clientKey}`}
          childLabel="Practices"
          childOptions={module.practices.map((practice) => ({
            code: practice.code,
            name: practice.name,
          }))}
          value={module.gatingRules}
          onChange={(gatingRules) => update({ ...module, gatingRules })}
        />
      </div>
      <div className="mt-8 flex items-start justify-between gap-4 border-t border-gray-100 pt-5">
        <ChildItemList
          title="Practices"
          parentCode={module.code}
          itemType="practice"
          items={module.practices}
          onSelect={onSelect}
          onMove={(practiceKey, direction) =>
            commands.movePractice(module.clientKey, practiceKey, direction)
          }
          onReorder={(activeKey, overKey) =>
            commands.reorderPractice(module.clientKey, activeKey, overKey)
          }
        />
        <button
          type="button"
          onClick={() => commands.addPractice(module.clientKey)}
          className="inline-flex shrink-0 items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add practice
        </button>
      </div>
    </>
  );
}
