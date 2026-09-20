import { MaturityModelSummary } from "@/api/types";
import type { MaturityModelGroup } from "@/app/maturity-models/catalog";
import { Badge } from "@/components/ui/badge";

export function ModelStatus({ group }: { group: MaturityModelGroup }) {
  return (
    <Badge color={group.activeVersion ? "emerald" : "gray"} dot outlined className="font-medium">
      {group.activeVersion ? "Active" : "No active version"}
    </Badge>
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
