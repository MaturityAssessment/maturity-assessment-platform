import { Badge } from "@/components/ui/badge";
import { getModuleBadges } from "../../model/moduleBadges";
import ModuleRelationshipsField from "./ModuleRelationshipsField";
import { ArrowLeftIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
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
  const badges = getModuleBadges(dimension, module);

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
        status={module.visible === false ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <EyeSlashIcon aria-hidden="true" className="h-3.5 w-3.5" />
            Hidden from assessments
          </span>
        ) : undefined}
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
          const message = "Delete this module and all of its practices?";
          if (!window.confirm(message))
            return;
          commands.deleteModule(dimension.clientKey, module.clientKey);
        }}
      />
      {badges.length > 0 && <section aria-label="Informational module badges" className="mb-5">
        <p className="mb-2 text-xs font-medium text-gray-500">Editor notes</p>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, index) => <Badge key={`${badge.key}:${index}`} color={badge.color} title={badge.title} className="max-w-full whitespace-normal break-words">{badge.label}</Badge>)}
        </div>
      </section>}

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
                  <div className="flex items-start justify-between gap-6 border-t border-gray-100 pt-5 @2xl:col-span-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">Assessment availability</h4>
                      <p id={`module-${module.clientKey}-visibility-description`} className="mt-1 max-w-lg text-sm leading-6 text-gray-500">
                        Include this module, its practices and questions in assessments and scoring.
                        Hidden content stays editable here.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 pt-0.5">
                      <span aria-hidden="true" className="hidden text-sm text-gray-500 @lg:block">{module.visible !== false ? "Included" : "Hidden"}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-label="Include module in assessments"
                        aria-checked={module.visible !== false}
                        aria-describedby={`module-${module.clientKey}-visibility-description`}
                        onClick={() => commands.toggleModuleVisibility(dimension.clientKey, module.clientKey)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${module.visible !== false ? "bg-blue-600" : "bg-gray-300"}`}
                      >
                        <span aria-hidden="true" className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${module.visible !== false ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>

              </>
            ),
          },
          {
            id: "relationships",
            label: "Relationships",
            count: (module.prerequisiteModuleCodes?.length ?? 0) + (module.coRequisiteModuleCodes?.length ?? 0) + (module.mutexModuleCodes?.length ?? 0),
            content: <ModuleRelationshipsField dimension={dimension} module={module} onChange={update} />,
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
              </>
            ),
          },
          {
            id: "gating",
            label: "Gating rules",
            count: (module.conditionalGatingRules?.length ?? 0) + (module.childStateGatingRules?.length ?? 0) + Number(module.minimumCoverage > 0) + Number(module.minimumIncludedCount > 0),
            content: (
              <GatingRuleField
                idPrefix={`module-${module.clientKey}`}
                aggregationRule={module.aggregationRule}
                isPractice={false}
                childType="practice"
                childStateGatingRules={module.childStateGatingRules}
                conditionalGatingRules={module.conditionalGatingRules}
                childOptions={module.practices.map(item => ({ code: `${dimension.code}.${module.code}.${item.code}`, name: item.name }))}
                minimumCoverage={module.minimumCoverage}
                minimumIncludedCount={module.minimumIncludedCount}
                onChange={(thresholds) => update({ ...module, ...thresholds })}
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
                onWeightChange={module.aggregationRule === "WEIGHTED_AVERAGE" ? (practiceKey, weight) => {
                  const practice = module.practices.find((item) => item.clientKey === practiceKey);
                  if (practice) commands.updatePractice(module.clientKey, practiceKey, { ...practice, weight });
                } : undefined}
                onAdd={() => commands.addPractice(module.clientKey)}
                onDelete={(practiceKey) => {
                  const selectedPractice = module.practices.find((item) => item.clientKey === practiceKey);
                  if (!selectedPractice) return;
                  const message = "Delete this practice and all of its questions?";
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
