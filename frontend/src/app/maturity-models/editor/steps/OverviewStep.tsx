"use client";

import { FileUp, ScrollText } from "lucide-react";
import { useState } from "react";
import type {
  Domain,
  MaturityModelEditorDocument,
} from "@/api/types";
import {
  inputClass,
  labelClass,
  Panel,
} from "../components/FormFields";
import { TEXT_LIMITS } from "@/config/textLimits";

export default function OverviewStep({
  document,
  domains,
  onChange,
}: {
  document: MaturityModelEditorDocument;
  domains: Domain[];
  onChange: (document: MaturityModelEditorDocument) => void;
}) {
  const [changelogImportError, setChangelogImportError] = useState<
    string | null
  >(null);

  const importChangelog = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".md")) {
      setChangelogImportError("Select a Markdown file ending in .md.");
      return;
    }
    const markdown = await file.text();
    if (markdown.length > TEXT_LIMITS.changelog) {
      setChangelogImportError(
        `The changelog must be ${TEXT_LIMITS.changelog.toLocaleString()} characters or fewer.`
      );
      return;
    }
    setChangelogImportError(null);
    onChange({ ...document, changelogMarkdown: markdown });
  };

  return (
    <Panel
      title="Model overview"
      description="Set the context people need to recognize and use this model."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <label className={labelClass}>
          Model name *
          <input
            id="model-name"
            className={inputClass}
            value={document.name}
            maxLength={TEXT_LIMITS.name}
            onChange={(event) =>
              onChange({ ...document, name: event.target.value })
            }
          />
        </label>
        <label className={labelClass}>
          Domain *
          <select
            id="model-domain"
            className={inputClass}
            value={document.domainId ?? ""}
            onChange={(event) =>
              onChange({
                ...document,
                domainId: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
          >
            <option value="">Select a domain</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${labelClass} lg:col-span-2`}>
          Description *
          <textarea
            id="model-description"
            rows={5}
            className={inputClass}
            value={document.description}
            maxLength={TEXT_LIMITS.description}
            onChange={(event) =>
              onChange({ ...document, description: event.target.value })
            }
          />
        </label>
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={labelClass}>Version changelog</p>
              <p className="mt-1 text-sm font-normal text-gray-500">
                Optional Markdown release notes shown on this version&apos;s
                Overview tab.
              </p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 self-start rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 sm:self-auto">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Import .md
              <input
                type="file"
                accept=".md,text/markdown,text/plain"
                className="sr-only"
                onChange={(event) => {
                  void importChangelog(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="relative mt-2">
            <ScrollText
              className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <textarea
              id="model-changelog"
              rows={10}
              className={`${inputClass} resize-y pl-10 font-mono text-[13px] leading-6`}
              value={document.changelogMarkdown}
              maxLength={TEXT_LIMITS.changelog}
              placeholder={"## What changed\n\n- Added ...\n- Improved ..."}
              onChange={(event) => {
                setChangelogImportError(null);
                onChange({
                  ...document,
                  changelogMarkdown: event.target.value,
                });
              }}
            />
          </div>
          <div className="mt-1.5 flex items-start justify-between gap-4 text-xs">
            <p
              className={
                changelogImportError ? "text-red-600" : "text-gray-500"
              }
            >
              {changelogImportError ??
                "Headings, lists, links, tables, and code blocks are supported."}
            </p>
            <span className="shrink-0 tabular-nums text-gray-400">
              {document.changelogMarkdown.length.toLocaleString()} /{" "}
              {TEXT_LIMITS.changelog.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="lg:col-span-2">
          <p className={labelClass}>Evaluation</p>
          <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4">
            <input
              id="model-auto-evaluated"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={document.autoEvaluated}
              onChange={(event) =>
                onChange({
                  ...document,
                  autoEvaluated: event.target.checked,
                })
              }
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">
                Automatically evaluate scored answers
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                Turn this off when expert review is required. Open-answer
                questions require manual evaluation.
              </span>
            </span>
          </label>
        </div>
      </div>
    </Panel>
  );
}
