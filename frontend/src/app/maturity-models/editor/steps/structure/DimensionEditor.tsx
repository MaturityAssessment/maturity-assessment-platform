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
                <div className="grid gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
                  <label className={`${labelClass} sm:col-span-2`}>
                    Description
                    <textarea
                      rows={4}
                      className={inputClass}
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
                <div className="grid gap-6 sm:grid-cols-2">
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
                    <span className="mt-2 block text-xs font-normal leading-5 text-gray-500">
                      Relative importance when the model uses weighted aggregation.
                    </span>
                  </label>
                  <AggregationRuleField
                    id={`dimension-${dimension.clientKey}-aggregation-rule`}
                    label="Module aggregation rule"
                    value={dimension.aggregationRule}
                    onChange={(aggregationRule) =>
                      update({ ...dimension, aggregationRule })
                    }
                  />
                </div>
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
