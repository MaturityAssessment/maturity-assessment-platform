import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ArrowDown, ArrowUp, Box, ChevronRight, ClipboardList, Layers,
  MoreHorizontal, Plus, Trash2, TriangleAlert,
} from "lucide-react";
import type { OutlineNode } from "../../model/outlineTree";

const ICONS = { dimension: Box, module: Layers, practice: ClipboardList };

export function Highlight({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  const index = term ? text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark className="rounded-sm bg-amber-100 text-inherit">{text.slice(index, index + term.length)}</mark>{text.slice(index + term.length)}</>;
}

export default function OutlineRow({
  node, selected, expanded, query, issues, dragging, reorderDisabled,
  canMoveUp, canMoveDown, onToggle, onSelect, onAdd, onDelete, onMove,
}: {
  node: OutlineNode;
  selected: boolean;
  expanded: boolean;
  query: string;
  issues: string[];
  dragging: boolean;
  reorderDisabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAdd: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef: setDraggableRef, setActivatorNodeRef } = useDraggable({
    id: node.id, disabled: reorderDisabled,
  });
  const { setNodeRef: setDroppableRef } = useDroppable({ id: node.id, disabled: reorderDisabled });
  const Icon = ICONS[node.selection.type];
  const empty = node.childCount === 0;
  const warning = empty ? `This ${node.selection.type} has no ${node.childLabel}s. Add a ${node.childLabel} before saving.` : issues.join("\n");

  return (
    <div
      ref={(element) => { setDraggableRef(element); setDroppableRef(element); }}
      data-outline-id={node.id}
      className={`group flex min-w-0 items-center rounded-md pr-1 transition-colors ${dragging ? "opacity-40" : ""} ${selected ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"}`}
    >
      {node.children.length ? (
        <button
          type="button" onClick={onToggle}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${node.label}`}
          aria-expanded={expanded} aria-controls={`outline-children-${node.id}`}
          disabled={Boolean(query.trim())}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-blue-600 focus-visible:outline-blue-500"
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
        </button>
      ) : <span className="w-[22px] shrink-0" />}
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        // The drag sensor suppresses the click after activation; ordinary clicks navigate.
        onClick={onSelect}
        aria-disabled={undefined}
        aria-roledescription={reorderDisabled ? undefined : "draggable element"}
        aria-current={selected ? "true" : undefined}
        aria-describedby="outline-interaction-hint"
        aria-label={`${node.selection.type}: ${node.label}${node.code ? ` (${node.code})` : ""}`}
        title={`${node.label}${node.code ? ` · ${node.code}` : ""}`}
        className={`flex min-w-0 flex-1 select-none items-center gap-1.5 rounded-md py-2 text-left focus-visible:outline-blue-500 ${reorderDisabled ? "" : "cursor-grab active:cursor-grabbing"}`}
      >
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-blue-600 ${selected ? "bg-blue-100" : "bg-blue-50"}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium"><Highlight text={node.label} query={query} /></span>
          {query.trim() && <span className="block truncate text-[11px] text-gray-400"><Highlight text={node.code} query={query} /></span>}
        </span>
      </button>
      {(empty || issues.length > 0) && (
        <span tabIndex={0} title={warning} aria-label={warning} className="ml-1 shrink-0 rounded p-0.5 focus-visible:outline-blue-500">
          <TriangleAlert className={`h-3.5 w-3.5 ${empty ? "text-amber-600" : "text-red-500"}`} aria-hidden="true" />
        </span>
      )}
      <Menu>
        <MenuButton
          aria-label={`Actions for ${node.label}`} title={`Actions for ${node.label}`}
          className={`ml-0.5 shrink-0 rounded-md p-1 text-gray-400 hover:bg-blue-100 hover:text-blue-700 focus-visible:outline-blue-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 ${selected ? "[@media(hover:hover)]:opacity-100" : ""}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </MenuButton>
        <MenuItems anchor="bottom end" className="z-50 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg [--anchor-gap:4px] focus:outline-none">
          <MenuItem><button type="button" onClick={onAdd} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 data-[focus]:bg-blue-50"><Plus className="h-4 w-4" aria-hidden="true" /> Add {node.childLabel}</button></MenuItem>
          <MenuItem disabled={!canMoveUp || reorderDisabled}><button type="button" disabled={!canMoveUp || reorderDisabled} onClick={() => onMove(-1)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 data-[focus]:bg-blue-50 disabled:opacity-40"><ArrowUp className="h-4 w-4" aria-hidden="true" /> Move up</button></MenuItem>
          <MenuItem disabled={!canMoveDown || reorderDisabled}><button type="button" disabled={!canMoveDown || reorderDisabled} onClick={() => onMove(1)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 data-[focus]:bg-blue-50 disabled:opacity-40"><ArrowDown className="h-4 w-4" aria-hidden="true" /> Move down</button></MenuItem>
          <div className="my-1 border-t border-gray-100" />
          <MenuItem><button type="button" onClick={onDelete} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 data-[focus]:bg-red-50"><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete</button></MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
