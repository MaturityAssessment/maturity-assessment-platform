import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function ChildListActions({ name, weighted, canMoveUp, canMoveDown, canDelete, onMoveUp, onMoveDown, onDelete }: {
  name: string;
  weighted: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`col-start-2 flex items-center justify-self-end gap-1 ${weighted ? "row-start-3 @sm:row-start-2 @lg:col-start-4" : "row-start-2 @lg:col-start-3"} @lg:row-start-1`}>
      <div className="flex rounded-lg border border-gray-200 bg-white">
        <button type="button" disabled={!canMoveUp} onClick={onMoveUp} aria-label={`Move ${name} up`} title="Move up"
          className="rounded-l-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-25">
          <ArrowUpIcon aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" disabled={!canMoveDown} onClick={onMoveDown} aria-label={`Move ${name} down`} title="Move down"
          className="rounded-r-lg border-l border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-25">
          <ArrowDownIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <button type="button" disabled={!canDelete} onClick={onDelete} aria-label={`Delete ${name}`} title="Delete"
        className="ml-1 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-25">
        <TrashIcon aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
