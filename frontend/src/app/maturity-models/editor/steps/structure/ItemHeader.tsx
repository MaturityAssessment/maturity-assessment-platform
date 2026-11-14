import type { ReactNode } from "react";
import ItemRowActions from "./ItemRowActions";

export default function ItemHeader({
  kind,
  code,
  name,
  context,
  status,
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
  status?: ReactNode;
  canDelete: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            {kind}
          </p>
          <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600 [overflow-wrap:anywhere]">
            {code}
          </span>
        </div>
        {name !== undefined && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-2xl font-semibold leading-8 tracking-tight text-gray-950 [overflow-wrap:anywhere]">
              {name || `Untitled ${kind.toLowerCase()}`}
            </h2>
            {status}
          </div>
        )}
        {context && (
          <p className="mt-1 text-sm leading-6 text-gray-500 [overflow-wrap:anywhere]">
            {context}
          </p>
        )}
      </div>
      <ItemRowActions
        name={name || kind}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        canDelete={canDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
      />
    </div>
  );
}
