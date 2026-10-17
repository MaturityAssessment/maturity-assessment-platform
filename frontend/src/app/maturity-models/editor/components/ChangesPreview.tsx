"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import type { MaturityModelEditorDocument } from "@/api/types";
import {
  buildChangeTree,
  type ChangeEntry,
  type ChangeTreeNode,
  type ChangesPreview as Preview,
} from "../model/editorChanges";
import { countItems } from "../model/editorDocument";
import { Panel } from "./FormFields";

const statuses = { updated: "Updated", added: "Added", removed: "Removed", order: "Reordered" };
const tones = {
  updated: { badge: "bg-blue-100 text-blue-800", border: "border-blue-200", header: "bg-blue-50/70" },
  added: { badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-300", header: "bg-emerald-50" },
  removed: { badge: "bg-rose-100 text-rose-800", border: "border-rose-300", header: "bg-rose-50" },
  order: { badge: "bg-amber-100 text-amber-900", border: "border-amber-200", header: "bg-amber-50/70" },
};

type DisclosureState = { expanded: Set<string>; onToggle: (id: string) => void };

function descendants(entry: ChangeEntry): number {
  return (entry.children ?? []).reduce((sum, child) => sum + 1 + descendants(child), 0);
}

function DiffValue({ value, previous }: { value: string; previous: boolean }) {
  return (
    <div className={`flex min-w-0 border-l-2 ${previous ? "border-rose-400 bg-rose-100/80 text-rose-950" : "border-emerald-500 bg-emerald-100/80 text-emerald-950"}`}>
      <span aria-hidden="true" className={`w-8 shrink-0 select-none py-2.5 text-center font-mono text-base ${previous ? "text-rose-600" : "text-emerald-700"}`}>
        {previous ? "−" : "+"}
      </span>
      <div className="min-w-0 flex-1 py-2.5 pr-3">
        <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${previous ? "text-rose-700" : "text-emerald-700"}`}>
          {previous ? "Previous" : "Current"}
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

function ChangeRow({ entry, expanded, onToggle }: { entry: ChangeEntry } & DisclosureState) {
  const count = descendants(entry);
  const tone = tones[entry.status];
  const open = expanded.has(entry.id);
  const label = entry.item?.name ?? entry.title;
  const visibleFields = entry.fields.filter(field =>
    entry.status === "added" ? !field.afterEmpty : entry.status === "removed" ? !field.beforeEmpty : true
  );
  return (
    <details open={open} className={`min-w-0 overflow-hidden rounded-lg border ${tone.border}`}>
      <summary
        onClick={(event) => { event.preventDefault(); onToggle(entry.id); }}
        aria-expanded={open}
        className={`flex cursor-pointer list-none items-start gap-2.5 p-3 outline-none transition hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden ${tone.header}`}
      >
        {open ? <ChevronDownIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" /> : <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />}
        <span className="min-w-0 flex-1">
          {entry.item && <span className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-medium text-gray-500">{entry.item.kind}</span>
            <span className="break-all font-mono text-gray-600">{entry.item.code}</span>
          </span>}
          <span title={label} className="block line-clamp-2 break-words text-sm font-medium leading-5 text-gray-950">{label}</span>
          {entry.status === "updated" && <span className="mt-1 block text-xs leading-5 text-gray-500">{entry.fields.map(field => field.label).join(" · ")}</span>}
          {count > 0 && <span className="mt-1 block text-xs text-gray-500">Includes {count} nested item{count === 1 ? "" : "s"}</span>}
        </span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold sm:text-xs ${tone.badge}`}>{statuses[entry.status]}</span>
      </summary>
      <div className="border-t border-inherit bg-white">
        {visibleFields.map(field => (
          <div key={field.label} className="min-w-0 border-b border-gray-100 last:border-b-0">
            <p className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">{field.label}</p>
            {entry.status !== "added" && !field.beforeEmpty && <DiffValue previous value={field.before} />}
            {entry.status !== "removed" && !field.afterEmpty && <DiffValue previous={false} value={field.after} />}
            {entry.status === "updated" && field.afterEmpty && <p className="bg-gray-50 px-3 py-2 text-xs text-gray-500">Now empty</p>}
          </div>
        ))}
        {visibleFields.length === 0 && !entry.children?.length && <p className="px-3 py-2 text-xs text-gray-500">No values provided</p>}
        {Boolean(entry.children?.length) && <div className="space-y-3 p-2 sm:p-3">
          {entry.children!.map(child => <ChangeRow key={child.id} entry={child} expanded={expanded} onToggle={onToggle} />)}
        </div>}
      </div>
    </details>
  );
}

function StructureNode({ node, ...disclosure }: { node: ChangeTreeNode } & DisclosureState) {
  return (
    <div className="min-w-0">
      {node.entry ? <ChangeRow entry={node.entry} {...disclosure} /> : node.item && (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5 text-xs leading-5 text-gray-400">
          <span className="shrink-0">{node.item.kind}</span>
          <span className="break-all font-mono">{node.item.code}</span>
          <span className="min-w-0 break-words text-gray-500">{node.item.name}</span>
        </div>
      )}
      {node.children.length > 0 && (
        <div className={`ml-1 space-y-3 border-l pl-2 sm:ml-2 sm:pl-4 ${node.entry ? "mt-3 border-blue-200" : "mt-1 border-gray-100"}`}>
          {node.children.map(child => <StructureNode key={child.key} node={child} {...disclosure} />)}
        </div>
      )}
    </div>
  );
}

function allEntryIds(entries: ChangeEntry[]): string[] {
  return entries.flatMap(entry => [entry.id, ...allEntryIds(entry.children ?? [])]);
}

export default function ChangesPreview({ changes, document }: { changes: Preview; document: MaturityModelEditorDocument }) {
  const entries = [...changes.overview, ...changes.scale, ...changes.structure, ...(changes.releaseNotes ? [changes.releaseNotes] : [])];
  const ids = allEntryIds(entries);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(!changes.isNew && ids.length <= 3 ? ids : []));
  const onToggle = (id: string) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const tree = buildChangeTree(changes.structure);
  const hasChanges = Object.values(changes.counts).some(count => count > 0);

  return (
    <Panel title="Changes preview" description={changes.isNew ? "New model — all content is new" : "Compared with the source version"}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          {changes.isNew ? (
            <p className="text-xs leading-5 text-gray-500">{Object.entries(countItems(document)).map(([label, count]) => `${count} ${label}`).join(" · ")}</p>
          ) : hasChanges ? (
            <div className="flex flex-wrap gap-2" aria-label="Change totals">
              {(Object.keys(changes.counts) as ChangeEntry["status"][]).filter(status => changes.counts[status] > 0).map(status => (
                <span key={status} className={`rounded-md px-2 py-1 text-xs font-medium ${tones[status].badge}`}>{changes.counts[status]} {statuses[status].toLowerCase()}</span>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No model changes from the source version.</p>}
          {ids.length > 0 && <div className="flex items-center gap-3 text-xs">
            <button type="button" onClick={() => setExpanded(new Set(ids))} className="rounded text-gray-500 hover:text-gray-950 focus-visible:outline-blue-500">Expand all</button>
            <span aria-hidden="true" className="text-gray-200">/</span>
            <button type="button" onClick={() => setExpanded(new Set())} className="rounded text-gray-500 hover:text-gray-950 focus-visible:outline-blue-500">Collapse all</button>
          </div>}
        </div>
        {changes.limitation && <p className="text-xs leading-5 text-gray-500">{changes.limitation}</p>}
        {([["Overview", changes.overview], ["Scale", changes.scale]] as const).map(([label, group]) => group.length > 0 && (
          <section key={label} aria-label={`${label} changes`}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</h3>
            <div className="space-y-3">{group.map(entry => <ChangeRow key={entry.id} entry={entry} expanded={expanded} onToggle={onToggle} />)}</div>
          </section>
        ))}
        {tree.length > 0 && <section aria-label="Structure changes" className="space-y-5">
          {tree.map(node => <StructureNode key={node.key} node={node} expanded={expanded} onToggle={onToggle} />)}
        </section>}
        {changes.releaseNotes && <section aria-label="Release notes changes" className="border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Release notes</h3>
          <ChangeRow entry={changes.releaseNotes} expanded={expanded} onToggle={onToggle} />
        </section>}
      </div>
    </Panel>
  );
}
