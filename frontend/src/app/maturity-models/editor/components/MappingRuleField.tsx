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
    <fieldset className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 md:col-span-2 @lg:p-5">
      <legend className="sr-only">Maturity mapping</legend>
      <h4 className="text-sm font-semibold text-gray-900">Maturity thresholds</h4>
      <p className="mt-1 text-sm leading-6 text-gray-500">
        Set the minimum score for each level. Start at 0% and increase with each level.
      </p>
      <div className="mt-4 divide-y divide-gray-100">
        {levels.map((level, index) => {
          const rule = value[index] ?? {
            levelNumber: index + 1,
            minimumScore: index === 0 ? 0 : index / levels.length,
          };
          return (
            <label key={level.number} className="grid grid-cols-[1.75rem_minmax(0,1fr)_5.5rem] items-center gap-3 py-3 text-sm font-medium text-gray-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</span>
              <span className="min-w-0 break-words">
                {level.name || "Unnamed level"}
                <span className="mt-0.5 block text-xs font-normal text-gray-400">{index === 0 ? "Starting level · fixed at 0%" : `Level ${index + 1} minimum`}</span>
              </span>
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
