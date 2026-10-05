import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type {
  ModelEditorDimension,
  ModelEditorModule,
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
import ChildItemList from "./ChildItemList";
import ItemHeader from "./ItemHeader";
import { TEXT_LIMITS } from "@/config/textLimits";
import AggregationRuleField from "../../components/AggregationRuleField";
import GatingRuleField from "../../components/GatingRuleField";
import ElementEditorTabs, { EditorSectionHeading } from "./ElementEditorTabs";

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
      <button
        type="button"
        onClick={() => onSelect({ type: "dimension", key: dimension.clientKey })}
        className="mb-5 inline-flex max-w-full items-center gap-2 rounded text-sm font-medium text-gray-500 outline-none hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ArrowLeftIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">Back to {dimension.name || "Untitled dimension"}</span>
      </button>
      <ItemHeader
        kind="Module"
        code={module.code}
        name={module.name}
        context={`${module.practices.length} practice${module.practices.length === 1 ? "" : "s"} in this module`}
        canMoveUp={moduleIndex > 0}
        canMoveDown={moduleIndex < dimension.modules.length - 1}
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
      <ElementEditorTabs
        kind="Module"
        tabs={[
          {
            id: "details",
            label: "Details",
            content: (
              <>
                <EditorSectionHeading
                  title="Module details"
                  description="Give this module a clear name and describe what it covers."
                />
                <div className="grid gap-6 rounded-xl border border-gray-200 bg-white p-4 @lg:p-5 @2xl:grid-cols-2">
                  <label className={labelClass}>
                    Name <span className="text-blue-600" aria-hidden="true">*</span>
                    <input
                      className={inputClass}
                      value={module.name}
                      aria-required="true"
                      placeholder="e.g. Leadership and accountability"
                      maxLength={TEXT_LIMITS.name}
                      onChange={(event) =>
                        update({
                          ...module,
                          name: event.target.value,
                          code:
                            module.codeLocked || module.name ||
                            module.code !== suggestCode("M", moduleIndex + 1, "Module")
                              ? module.code
                              : suggestCode(
                                  "M",
                                  moduleIndex + 1,
                                  event.target.value
                                ),
                        })
                      }
                    />
                  </label>
                  <CodeField
                    id={`module-${module.clientKey}-code`}
                    value={module.code}
                    prefix={codePrefix("M", moduleIndex + 1)}
                    locked={module.codeLocked}
                    onChange={(code) => update({ ...module, code })}
                  />
                  <label className={`${labelClass} @2xl:col-span-2`}>
                    <span className="flex items-center justify-between gap-3">
                      Description <span className="text-xs font-normal text-gray-400">Optional</span>
                    </span>
                    <textarea
                      rows={5}
                      className={`${inputClass} resize-y leading-6`}
                      value={module.description}
                      maxLength={TEXT_LIMITS.description}
                      placeholder="Describe the purpose and scope of this module."
                      onChange={(event) =>
                        update({ ...module, description: event.target.value })
                      }
                    />
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
                  description="Choose how practice scores combine into the module score."
                />
                <AggregationRuleField
                  cards
                  id={`module-${module.clientKey}-aggregation-rule`}
                  label="Practice aggregation rule"
                  value={module.aggregationRule}
                  onChange={(aggregationRule) =>
                    update({ ...module, aggregationRule })
                  }
                />
                <label className="grid gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-5 @lg:grid-cols-[minmax(0,1fr)_8rem]">
                  <span className="text-sm font-semibold text-gray-900">Weight in the dimension</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={`${inputClass} @lg:col-start-2 @lg:row-span-2 @lg:row-start-1 @lg:self-center`}
                    value={module.weight}
                    onChange={(event) =>
                      update({ ...module, weight: Number(event.target.value) || 1 })
                    }
                  />
                  <span className="block text-sm font-normal leading-6 text-gray-500">
                    Relative importance when this dimension uses weighted aggregation.
                  </span>
                </label>
              </>
            ),
          },
          {
            id: "gating",
            label: "Gating rules",
            count: module.gatingRules.length,
            content: (
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
            ),
          },
          {
            id: "practices",
            label: "Practices",
            count: module.practices.length,
            content: (
              <ChildItemList
                title="Practices"
                parentCode={module.code}
                itemType="practice"
                items={module.practices}
                onAdd={() => commands.addPractice(module.clientKey)}
                onDelete={(practiceKey) => {
                  const selectedPractice = module.practices.find((item) => item.clientKey === practiceKey);
                  if (!selectedPractice) return;
                  const referenced = module.gatingRules.some((rule) =>
                    rule.selection === "specificChild" &&
                    rule.childCode?.toLowerCase() === selectedPractice.code.toLowerCase()
                  );
                  const message = referenced
                    ? "Delete this practice and all of its questions? Gating rules that reference it will also be removed."
                    : "Delete this practice and all of its questions?";
                  if (window.confirm(message)) commands.deletePractice(module.clientKey, practiceKey);
                }}
                onSelect={onSelect}
                onMove={(practiceKey, direction) =>
                  commands.movePractice(module.clientKey, practiceKey, direction)
                }
                onReorder={(activeKey, overKey) =>
                  commands.reorderPractice(module.clientKey, activeKey, overKey)
                }
              />
            ),
          },
        ]}
      />
    </>
  );
}
