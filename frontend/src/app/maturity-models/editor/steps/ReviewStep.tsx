import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { MaturityModelEditorDocument } from "@/api/types";
import { Panel } from "../components/FormFields";
import { countItems } from "../model/editorDocument";
import type { EditorIssue } from "../model/editorTypes";

export default function ReviewStep({
  document,
  issues,
  editing,
  onIssueClick,
}: {
  document: MaturityModelEditorDocument;
  issues: EditorIssue[];
  editing: boolean;
  onIssueClick: (issue: EditorIssue) => void;
}) {
  const counts = countItems(document);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_23rem]">
      <Panel
        title="Review model"
        description="Check the complete shape and follow any issue back to its source."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(counts).map(([label, count]) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <p className="text-2xl font-semibold text-gray-950">{count}</p>
              <p className="mt-1 text-sm capitalize text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        <dl className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200">
          <ReviewRow label="Name" value={document.name || "Not provided"} />
          <ReviewRow
            label="Maturity levels"
            value={`${document.levels.length} levels`}
          />
          <ReviewRow
            label="Evaluation"
            value={document.autoEvaluated ? "Automatic" : "Manual review"}
          />
          <ReviewRow
            label="Overall aggregation"
            value={document.aggregationRule
              .toLowerCase()
              .replaceAll("_", " ")
              .replace(/^./, (character) => character.toUpperCase())}
          />
          <ReviewRow
            label="Changelog"
            value={
              document.changelogMarkdown.trim()
                ? "Markdown release notes included"
                : "No release notes"
            }
          />
          <ReviewRow
            label="Save behavior"
            value={
              editing
                ? "Creates a new inactive version"
                : "Creates an inactive model"
            }
          />
        </dl>
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          Activation remains a separate action on the model detail page. Saving
          here will not affect the model currently used for assessments.
        </div>
      </Panel>
      <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon
            className={`h-5 w-5 ${errors.length ? "text-red-500" : "text-green-600"}`}
          />
          <h2 className="font-semibold text-gray-950">
            {errors.length
              ? `${errors.length} blocking issue${errors.length === 1 ? "" : "s"}`
              : "Ready to save"}
          </h2>
        </div>
        <div className="mt-4 space-y-2">
          {[...errors, ...warnings].map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={() => onIssueClick(issue)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition hover:shadow-sm ${
                issue.severity === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {issue.message}
            </button>
          ))}
          {!issues.length && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              All required content and dependency checks pass.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 px-4 py-3 text-sm">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
