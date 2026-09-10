"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  getVersionSummary,
  MaturityModelGroup,
  pluralLabel,
} from "./catalog";
import { ModelMetrics, ModelStatus } from "./ModelCatalogMetadata";
import { DomainIcon } from "@/components/DomainIcon";

type ModelRowProps = {
  group: MaturityModelGroup;
  onOpen: (modelId: number) => void;
};

export default function ModelRow({ group, onOpen }: ModelRowProps) {
  const model = group.representative;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`View details for ${model.name}`}
      onClick={() => onOpen(group.baseModelId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(group.baseModelId);
        }
      }}
      className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm outline-none transition hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 gap-3">
          <DomainIcon
            iconKey={model.domainIconKey}
            colorKey={model.domainColorKey}
            name={model.domainName}
            size={18}
          />
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-base font-semibold text-gray-950">
              {model.name}
            </h2>
            <ModelStatus group={group} />
          </div>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            {model.domainName || "Unassigned domain"}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-600">
            {model.description || "No description provided."}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {getVersionSummary(group)} · {group.versions.length}{" "}
            {pluralLabel(group.versions.length, "version", "versions")}
          </p>
          </div>
        </div>

        <ModelMetrics model={model} />

        <span className="inline-flex items-center justify-self-start text-sm font-medium text-blue-600 lg:justify-self-end">
          View details
          <ChevronRightIcon
            className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </article>
  );
}
