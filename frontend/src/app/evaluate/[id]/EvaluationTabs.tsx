"use client";

import { BarChart3, ChevronDown, FileText, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvaluationDimension, EvaluationTab } from "./types";

interface EvaluationTabsProps {
  activeTab: EvaluationTab;
  dimensions: EvaluationDimension[];
  onChange: (tab: EvaluationTab) => void;
}

export default function EvaluationTabs({
  activeTab,
  dimensions,
  onChange,
}: EvaluationTabsProps) {
  const activeDimensionId = activeTab.startsWith("dimension:")
    ? activeTab.replace("dimension:", "")
    : "";

  return (
    <nav
      aria-label="Evaluation sections"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center"
    >
      <button
        type="button"
        onClick={() => onChange("general")}
        className={tabClass(activeTab === "general")}
      >
        <FileText className="h-4 w-4" />
        General
      </button>

      <div className="relative min-w-0 flex-1">
        <LayoutList className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <select
          aria-label="Evaluation dimension"
          value={activeDimensionId}
          onChange={(event) => {
            if (event.target.value) {
              onChange(`dimension:${event.target.value}` as EvaluationTab);
            }
          }}
          className={cn(
            "h-10 w-full appearance-none rounded-md border bg-white pl-9 pr-9 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-blue-500",
            activeDimensionId
              ? "border-blue-300 text-blue-800"
              : "border-gray-300 text-gray-600"
          )}
        >
          <option value="">Choose dimension</option>
          {dimensions.map((dimension) => {
            const count = dimension.groups.reduce(
              (total, group) => total + group.questions.length,
              0
            );
            return (
              <option key={dimension.id} value={dimension.id}>
                {dimension.name} ({count})
              </option>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      </div>

      <button
        type="button"
        onClick={() => onChange("results")}
        className={tabClass(activeTab === "results")}
      >
        <BarChart3 className="h-4 w-4" />
        Results
      </button>
    </nav>
  );
}

function tabClass(active: boolean) {
  return cn(
    "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
    active
      ? "bg-blue-600 text-white"
      : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"
  );
}
