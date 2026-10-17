import WeightInput from "../../components/WeightInput";
import type {
  MaturityModelEditorDocument,
  ModelEditorDimension,
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
import MappingRuleField from "../../components/MappingRuleField";
import GatingRuleField from "../../components/GatingRuleField";
import ElementEditorTabs, { EditorSectionHeading } from "./ElementEditorTabs";

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
        name={dimension.name}
        context={`${dimension.modules.length} module${dimension.modules.length === 1 ? "" : "s"} in this dimension`}
        canMoveUp={dimensionIndex > 0}
        canMoveDown={dimensionIndex < document.dimensions.length - 1}
        canDelete={document.dimensions.length > 1}
        onMoveUp={() => commands.moveDimension(dimension.clientKey, -1)}
        onMoveDown={() => commands.moveDimension(dimension.clientKey, 1)}
        onDelete={() => {
          if (!window.confirm("Delete this dimension and all of its content?"))
            return;
          commands.deleteDimension(dimension.clientKey);
        }}
      />
      <ElementEditorTabs
        kind="Dimension"
        tabs={[
          {
            id: "details",
            label: "Details",
            content: (
              <>
                <EditorSectionHeading
                  title="Dimension details"
                  description="Give this dimension a clear name and describe what it covers."
                />
                <div className="grid gap-6 rounded-xl border border-gray-200 bg-white p-4 @lg:p-5 @2xl:grid-cols-2">
                  <label className={labelClass}>
                    Name <span className="text-blue-600" aria-hidden="true">*</span>
                    <input
                      className={inputClass}
                      value={dimension.name}
                      aria-required="true"
                      placeholder="e.g. Governance and strategy"
                      maxLength={TEXT_LIMITS.name}
                      onChange={(event) =>
                        update({
                          ...dimension,
                          name: event.target.value,
                          code:
                            dimension.codeLocked || dimension.name ||
                            dimension.code !== suggestCode("D", dimensionIndex + 1, "Dimension")
                              ? dimension.code
                              : suggestCode(
                                  "D",
                                  dimensionIndex + 1,
                                  event.target.value
                                ),
                        })
                      }
                    />
                  </label>
                  <CodeField
                    id={`dimension-${dimension.clientKey}-code`}
                    value={dimension.code}
                    prefix={codePrefix("D", dimensionIndex + 1)}
                    locked={dimension.codeLocked}
                    onChange={(code) => update({ ...dimension, code })}
                  />
                  <label className={`${labelClass} @2xl:col-span-2`}>
                    <span className="flex items-center justify-between gap-3">
                      Description <span className="text-xs font-normal text-gray-400">Optional</span>
                    </span>
                    <textarea
                      rows={5}
                      className={`${inputClass} resize-y leading-6`}
                      value={dimension.description}
                      maxLength={TEXT_LIMITS.description}
                      placeholder="Describe the purpose and scope of this dimension."
                      onChange={(event) =>
                        update({ ...dimension, description: event.target.value })
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
                  description="Choose how module scores combine and map to a maturity level."
                />
                <AggregationRuleField
                  cards
                  id={`dimension-${dimension.clientKey}-aggregation-rule`}
                  label="Module aggregation rule"
                  value={dimension.aggregationRule}
                  onChange={(aggregationRule) =>
                    update({ ...dimension, aggregationRule })
                  }
                />
                <label className="grid gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-gray-50/70 p-5 @lg:grid-cols-[minmax(0,1fr)_8rem]">
                  <span className="text-sm font-semibold text-gray-900">Weight in the model</span>
                  <WeightInput
                    key={dimension.clientKey}
                    id={`dimension-${dimension.clientKey}-weight`}
                    className="@lg:col-start-2 @lg:row-span-2 @lg:row-start-1 @lg:self-center"
                    value={dimension.weight}
                    onChange={(weight) => update({ ...dimension, weight })}
                  />
                  <span className="block text-sm font-normal leading-6 text-gray-500">
                    Relative importance when the model uses weighted aggregation.
                  </span>
                </label>
                <MappingRuleField
                  idPrefix={`dimension-${dimension.clientKey}`}
                  levels={document.levels}
                  value={dimension.mappingRules}
                  onChange={(mappingRules) =>
                    update({ ...dimension, mappingRules })
                  }
                />
              </>
            ),
          },
          {
            id: "gating",
            label: "Gating rules",
            count: dimension.gatingRules.length,
            content: (
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
            ),
          },
          {
            id: "modules",
            label: "Modules",
            count: dimension.modules.length,
            content: (
              <ChildItemList
                title="Modules"
                parentCode={dimension.code}
                itemType="module"
                items={dimension.modules}
                onAdd={() => commands.addModule(dimension.clientKey)}
                onDelete={(moduleKey) => {
                  const selectedModule = dimension.modules.find((item) => item.clientKey === moduleKey);
                  if (!selectedModule) return;
                  const referenced = dimension.gatingRules.some((rule) =>
                    rule.selection === "specificChild" &&
                    rule.childCode?.toLowerCase() === selectedModule.code.toLowerCase()
                  );
                  const message = referenced
                    ? "Delete this module and all of its practices? Gating rules that reference it will also be removed."
                    : "Delete this module and all of its practices?";
                  if (window.confirm(message)) commands.deleteModule(dimension.clientKey, moduleKey);
                }}
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
            ),
          },
        ]}
      />
    </>
  );
}
