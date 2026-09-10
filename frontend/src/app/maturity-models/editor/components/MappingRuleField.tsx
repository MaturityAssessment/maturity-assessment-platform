import type { MappingRule, MaturityLevel } from "@/api/types";
import { inputClass } from "./FormFields";

export default function MappingRuleField({
  idPrefix,
  levels,
  value,
  onChange,
}: {
  idPrefix: string;
  levels: MaturityLevel[];
  value: MappingRule[];
  onChange: (rules: MappingRule[]) => void;
}) {
  return (
    <fieldset className="md:col-span-2 rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">
        Maturity mapping
      </legend>
      <p className="mb-3 text-sm text-gray-500">
        Set the minimum normalized score required for each maturity level.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((level, index) => {
          const rule = value[index] ?? {
            levelNumber: index + 1,
            minimumScore: index === 0 ? 0 : index / levels.length,
          };
          return (
            <label key={level.number} className="text-sm font-medium text-gray-700">
              Level {index + 1}: {level.name || "Unnamed"}
              <div className="relative">
                <input
                  id={`${idPrefix}-mapping-level-${level.number}`}
                  aria-label={`Level ${index + 1} minimum normalized score`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={index === 0}
                  className={`${inputClass} pr-8 disabled:bg-gray-50 disabled:text-gray-500`}
                  value={Math.round(rule.minimumScore * 1000) / 10}
                  onChange={(event) => {
                    const percentage = Number(event.target.value);
                    onChange(
                      levels.map((_, ruleIndex) => ({
                        levelNumber: ruleIndex + 1,
                        minimumScore:
                          ruleIndex === index
                            ? percentage / 100
                            : (value[ruleIndex]?.minimumScore ??
                              (ruleIndex === 0 ? 0 : ruleIndex / levels.length)),
                      }))
                    );
                  }}
                />
                <span className="pointer-events-none absolute right-3 top-3 text-sm text-gray-400">
                  %
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
