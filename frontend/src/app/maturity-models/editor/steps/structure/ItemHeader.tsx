import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export default function ItemHeader({
  kind,
  code,
  name,
  context,
  canDelete,
  canMoveUp = true,
  canMoveDown = true,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  kind: string;
  code: string;
  name?: string;
  context?: string;
  canDelete: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {kind}
          </p>
          <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600 [overflow-wrap:anywhere]">
            {code}
          </span>
        </div>
        {name !== undefined && (
          <h2 className="mt-3 text-xl font-semibold leading-7 text-gray-950 [overflow-wrap:anywhere]">
            {name || `Untitled ${kind.toLowerCase()}`}
          </h2>
        )}
        {context && (
          <p className="mt-1 text-sm leading-6 text-gray-500 [overflow-wrap:anywhere]">
            {context}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label={`Move ${kind} up`}
          title={`Move ${kind.toLowerCase()} up`}
          className="rounded-md p-2 text-gray-500 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label={`Move ${kind} down`}
          title={`Move ${kind.toLowerCase()} down`}
          className="rounded-md p-2 text-gray-500 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label={`Delete ${kind}`}
          title={`Delete ${kind.toLowerCase()}`}
          className="ml-2 rounded-md p-2 text-gray-400 outline-none hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
