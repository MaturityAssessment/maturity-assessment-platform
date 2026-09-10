import { MaturityModelSummary } from "@/api/types";
import { MaturityModelGroup } from "./catalog";

export function ModelStatus({ group }: { group: MaturityModelGroup }) {
  return (
    <span
      className={
        group.activeVersion
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"
          : "inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
      }
    >
      <span
        className={
          group.activeVersion
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
            : "h-1.5 w-1.5 rounded-full bg-gray-400"
        }
        aria-hidden="true"
      />
      {group.activeVersion ? "Active" : "No active version"}
    </span>
  );
}

export function ModelMetrics({ model }: { model: MaturityModelSummary }) {
  const metrics = [
    ["Levels", model.levelCount],
    ["Dimensions", model.dimensionCount],
    ["Modules", model.moduleCount],
    ["Questions", model.totalQuestions],
  ] as const;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-gray-500">{label}</dt>
          <dd className="mt-0.5 text-base font-semibold tabular-nums text-gray-900">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
