import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export default function ItemHeader({
  kind,
  code,
  canDelete,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  kind: string;
  code: string;
  canDelete: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          {kind}
        </p>
        <p className="mt-1 font-mono text-sm text-gray-500">{code}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          aria-label={`Move ${kind} up`}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          aria-label={`Move ${kind} down`}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label={`Delete ${kind}`}
          className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
