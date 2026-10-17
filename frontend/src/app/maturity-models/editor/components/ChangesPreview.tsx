import type { MaturityModelEditorDocument } from "@/api/types";
import type { ChangeEntry, ChangesPreview as Preview } from "../model/editorChanges";
import { countItems } from "../model/editorDocument";
import { Panel } from "./FormFields";

const statuses = { updated: "Updated", added: "Added", removed: "Removed", order: "Order changed" };
const colors = { updated: "bg-blue-50 text-blue-800", added: "bg-green-50 text-green-800", removed: "bg-red-50 text-red-800", order: "bg-gray-100 text-gray-700" };
function descendants(entry: ChangeEntry): number {
  return (entry.children ?? []).reduce((sum, child) => sum + 1 + descendants(child), 0);
}
function ChangeRow({ entry }: { entry: ChangeEntry }) {
  const count = descendants(entry);
  return <details className="min-w-0 rounded-lg border border-gray-200 bg-white">
    <summary className="cursor-pointer rounded-lg p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <span className={`mx-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[entry.status]}`}>{statuses[entry.status]}</span>
      <span title={entry.title} className="mt-1 line-clamp-2 break-words pl-6 font-medium text-gray-950">{entry.title}</span>
      {entry.path && <span className="mt-1 line-clamp-2 break-words pl-6 text-xs text-gray-500">{entry.path}</span>}
      {entry.status === "updated" && <span className="mt-1 block pl-6 text-xs text-gray-600">{entry.fields.map(f => f.label).join(" · ")}</span>}
      {count > 0 && <span className="mt-1 block pl-6 text-xs text-gray-600">Includes {count} nested item{count === 1 ? "" : "s"}</span>}
    </summary>
    <div className="space-y-3 border-t border-gray-100 p-3">
      {entry.fields.map(field => <div key={field.label} className="min-w-0 text-sm">
        <p className="font-medium text-gray-900">{field.label}</p>
        <dl className="mt-1 space-y-2">
          {entry.status !== "added" && <div className="rounded bg-gray-50 p-2"><dt className="text-xs font-medium text-gray-500">Before</dt><dd className="mt-1 whitespace-pre-wrap break-words text-gray-700">{field.before || "Not provided"}</dd></div>}
          {entry.status !== "removed" && <div className="rounded bg-blue-50/50 p-2"><dt className="text-xs font-medium text-gray-500">{entry.status === "added" ? "Value" : "After"}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-gray-900">{field.after || "Not provided"}</dd></div>}
        </dl>
      </div>)}
      {entry.children?.map(child => <ChangeRow key={child.id} entry={child} />)}
    </div>
  </details>;
}
export default function ChangesPreview({ changes, document }: { changes: Preview; document: MaturityModelEditorDocument }) {
  const groups = [["Overview", changes.overview], ["Scale", changes.scale], ["Structure", changes.structure]] as const;
  const summary = Object.entries(changes.counts).filter(([, count]) => count > 0).map(([status, count]) => `${count} ${status === "order" ? "order change" + (count === 1 ? "" : "s") : status}`).join(" · ");
  return <Panel title="Changes preview" description={changes.isNew ? "New model — all content is new" : "Compared with the source version"}>
    <div className="space-y-4">
      {changes.isNew ? <p className="text-sm text-gray-600">{Object.entries(countItems(document)).map(([label, count]) => `${count} ${label}`).join(" · ")}</p> : <p className="text-sm font-medium text-gray-700">{summary || "No model changes from the source version."}</p>}
      {changes.limitation && <p className="text-xs leading-5 text-gray-500">{changes.limitation}</p>}
      {groups.map(([label, entries]) => entries.length > 0 && <section key={label} aria-label={`${label} changes`}>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">{label}</h3>
        <div className="space-y-2">{entries.map(entry => <ChangeRow key={entry.id} entry={entry} />)}</div>
      </section>)}
      {changes.releaseNotes && <section aria-label="Release notes changes"><h3 className="mb-2 text-sm font-semibold text-gray-700">Release notes</h3><ChangeRow entry={changes.releaseNotes} /></section>}
    </div>
  </Panel>;
}
