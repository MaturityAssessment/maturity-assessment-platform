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
      <ItemHeader
        kind="Module"
        code={module.code}
        name={module.name}
        context={`In ${dimension.name || "Untitled dimension"} · ${module.practices.length} practice${module.practices.length === 1 ? "" : "s"}`}
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
                <div className="grid gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
                  <label className={`${labelClass} sm:col-span-2`}>
                    Description
                    <textarea
                      rows={4}
                      className={inputClass}
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
                <div className="grid gap-6 sm:grid-cols-2">
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
                    <span className="mt-2 block text-xs font-normal leading-5 text-gray-500">
                      Relative importance when this dimension uses weighted aggregation.
                    </span>
                  </label>
                  <AggregationRuleField
                    id={`module-${module.clientKey}-aggregation-rule`}
                    label="Practice aggregation rule"
                    value={module.aggregationRule}
                    onChange={(aggregationRule) =>
                      update({ ...module, aggregationRule })
                    }
                  />
                </div>
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
