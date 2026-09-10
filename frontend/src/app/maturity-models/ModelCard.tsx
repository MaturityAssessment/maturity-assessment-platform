"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  getVersionSummary,
  MaturityModelGroup,
  pluralLabel,
} from "./catalog";
import { ModelMetrics, ModelStatus } from "./ModelCatalogMetadata";
import { DomainIcon } from "@/components/DomainIcon";

type ModelCardProps = {
  group: MaturityModelGroup;
  onOpen: (modelId: number) => void;
};

export default function ModelCard({ group, onOpen }: ModelCardProps) {
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
      className="group flex h-full min-h-[19rem] cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <DomainIcon
          iconKey={model.domainIconKey}
          colorKey={model.domainColorKey}
          name={model.domainName}
          size={20}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">
            {model.domainName || "Unassigned domain"}
          </p>
          <h2 className="mt-1 line-clamp-2 break-words text-lg font-semibold leading-snug text-gray-950">
            {model.name}
          </h2>
        </div>
        <ModelStatus group={group} />
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
        {model.description || "No description provided."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>{getVersionSummary(group)}</span>
        <span aria-hidden="true">·</span>
        <span>
          {group.versions.length}{" "}
          {pluralLabel(group.versions.length, "version", "versions")}
        </span>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <ModelMetrics model={model} />
      </div>

      <div className="mt-auto flex items-center justify-end pt-5 text-sm font-medium text-blue-600">
        View details
        <ChevronRightIcon
          className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </article>
  );
}
