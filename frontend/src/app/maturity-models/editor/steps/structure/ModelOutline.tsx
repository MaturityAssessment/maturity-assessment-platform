import { PlusIcon } from "@heroicons/react/24/outline";
import type { MaturityModelEditorDocument } from "@/api/types";
import type {
  EditorIssue,
  Selection,
} from "../../model/editorTypes";

export default function ModelOutline({
  document,
  selection,
  issues,
  onSelect,
  onAddDimension,
}: {
  document: MaturityModelEditorDocument;
  selection: Selection | null;
  issues: EditorIssue[];
  onSelect: (selection: Selection) => void;
  onAddDimension: () => void;
}) {
  const issueCount = (candidate: Selection) =>
    issues.filter(
      (issue) =>
        issue.selection?.type === candidate.type &&
        issue.selection.key === candidate.key &&
        issue.severity === "error"
    ).length;

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between px-2 py-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
          Model outline
        </h2>
        <button
          type="button"
          onClick={onAddDimension}
          aria-label="Add dimension"
          className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {document.dimensions.map((dimension) => (
          <div key={dimension.clientKey}>
            <OutlineButton
              active={
                selection?.type === "dimension" &&
                selection.key === dimension.clientKey
              }
              label={dimension.name || "*Untitled dimension"}
              code={dimension.code}
              count={issueCount({
                type: "dimension",
                key: dimension.clientKey,
              })}
              onClick={() =>
                onSelect({
                  type: "dimension",
                  key: dimension.clientKey,
                })
              }
            />
            <div className="ml-3 border-l border-gray-200 pl-2">
              {dimension.modules.map((module) => (
                <div key={module.clientKey}>
                  <OutlineButton
                    compact
                    active={
                      selection?.type === "module" &&
                      selection.key === module.clientKey
                    }
                    label={module.name || "*Untitled module"}
                    code={module.code}
                    count={issueCount({
                      type: "module",
                      key: module.clientKey,
                    })}
                    onClick={() =>
                      onSelect({ type: "module", key: module.clientKey })
                    }
                  />
                  <div className="ml-3 border-l border-gray-100 pl-2">
                    {module.practices.map((practice) => (
                      <OutlineButton
                        key={practice.clientKey}
                        compact
                        active={
                          selection?.type === "practice" &&
                          selection.key === practice.clientKey
                        }
                        label={practice.name || "*Untitled practice"}
                        code={practice.code}
                        count={issueCount({
                          type: "practice",
                          key: practice.clientKey,
                        })}
                        onClick={() =>
                          onSelect({
                            type: "practice",
                            key: practice.clientKey,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function OutlineButton({
  active,
  compact,
  label,
  code,
  count,
  onClick,
}: {
  active: boolean;
  compact?: boolean;
  label: string;
  code: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center justify-between gap-2 rounded-md px-2.5 text-left transition ${
        compact ? "py-2" : "py-2.5"
      } ${
        active
          ? "bg-blue-50 text-blue-900"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-[11px] uppercase tracking-wide text-gray-400">
          {code}
        </span>
      </span>
      {count > 0 && (
        <span className="rounded-full bg-red-100 px-1.5 text-xs text-red-700">
          {count}
        </span>
      )}
    </button>
  );
}
