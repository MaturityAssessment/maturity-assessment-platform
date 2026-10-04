import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin,
  useSensor, useSensors,
  type CollisionDetection, type DragMoveEvent,
} from "@dnd-kit/core";
import { Box, ClipboardList, Layers, Plus, Search, X } from "lucide-react";
import type { MaturityModelEditorDocument } from "@/api/types";
import type { EditorIssue, Selection, StructureEditorCommands } from "../../model/editorTypes";
import {
  buildOutlineTree, filterOutline, flattenOutline, matchesOutline,
  outlineId, outlineReorderTarget, type OutlineNode,
} from "../../model/outlineTree";
import OutlineRow from "./OutlineRow";

type DropPosition = { id: string; after: boolean };
const ICONS = { dimension: Box, module: Layers, practice: ClipboardList };

export default function ModelOutline({ document, selection, issues, onSelect, commands }: {
  document: MaturityModelEditorDocument;
  selection: Selection | null;
  issues: EditorIssue[];
  onSelect: (selection: Selection) => void;
  commands: StructureEditorCommands;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropPosition | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const scrollRef = useRef<HTMLElement>(null);
  const pointerY = useRef<number | null>(null);
  const dropRef = useRef<DropPosition | null>(null);
  const previousSelection = useRef<string | null>(null);
  const tree = useMemo(() => buildOutlineTree(document), [document]);
  const nodes = useMemo(() => flattenOutline(tree), [tree]);
  const filtered = useMemo(() => filterOutline(tree, query), [tree, query]);
  const searching = Boolean(query.trim());
  const selectedId = selection ? outlineId(selection) : null;
  const activeNode = nodes.find((node) => node.id === activeId);
  const branches = nodes.filter((node) => node.children.length > 0);
  const matches = searching ? nodes.filter((node) => matchesOutline(node, query)).length : 0;
  const issueMessages = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const issue of issues) {
      if (!issue.selection) continue;
      const id = outlineId(issue.selection);
      result.set(id, [...(result.get(id) ?? []), issue.message]);
    }
    return result;
  }, [issues]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  // Reveal selections made elsewhere in the editor, including newly added children.
  useEffect(() => {
    if (previousSelection.current === selectedId) return;
    previousSelection.current = selectedId;
    const parents: string[] = [];
    let node = nodes.find((candidate) => candidate.id === selectedId);
    while (node?.parentId) {
      parents.push(node.parentId);
      node = nodes.find((candidate) => candidate.id === node!.parentId);
    }
    setCollapsed((previous) => {
      if (!parents.some((id) => previous.has(id))) return previous;
      const next = new Set(previous);
      parents.forEach((id) => next.delete(id));
      return next;
    });
  }, [nodes, selectedId]);

  // Scroll the outline itself; selecting an element must not move the whole page.
  useEffect(() => {
    if (!selectedId) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const row = container?.querySelector<HTMLElement>(`[data-outline-id="${CSS.escape(selectedId)}"]`);
      if (!container || !row) return;
      const bounds = container.getBoundingClientRect();
      const item = row.getBoundingClientRect();
      if (item.top < bounds.top) container.scrollTop += item.top - bounds.top;
      else if (item.bottom > bounds.bottom) container.scrollTop += item.bottom - bounds.bottom;
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId]);

  const collisionDetection: CollisionDetection = (args) => {
    pointerY.current = args.pointerCoordinates?.y ?? null;
    const source = nodes.find((node) => node.id === args.active.id);
    return pointerWithin({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) => {
        const target = nodes.find((node) => node.id === container.id);
        return source && target && source.parentId === target.parentId && source.selection.type === target.selection.type;
      }),
    });
  };

  const updateDrop = ({ active, over }: DragMoveEvent) => {
    const next = over ? {
      id: String(over.id),
      after: (pointerY.current ?? active.rect.current.translated?.top ?? 0) > over.rect.top + over.rect.height / 2,
    } : null;
    dropRef.current = next;
    setDrop((previous) => previous?.id === next?.id && previous?.after === next?.after ? previous : next);
  };

  const clearDrag = () => {
    setActiveId(null);
    setDrop(null);
    dropRef.current = null;
    pointerY.current = null;
  };

  const reorder = (source: OutlineNode, target: OutlineNode) => {
    const key = source.selection.key;
    if (source.selection.type === "dimension") commands.reorderDimension(key, target.selection.key);
    else if (source.selection.type === "module" && source.parentKey) commands.reorderModule(source.parentKey, key, target.selection.key);
    else if (source.selection.type === "practice" && source.parentKey) commands.reorderPractice(source.parentKey, key, target.selection.key);
    setAnnouncement(`Moved ${source.label}.`);
  };

  const addChild = (node: OutlineNode) => {
    setQuery("");
    setCollapsed((previous) => { const next = new Set(previous); next.delete(node.id); return next; });
    if (node.selection.type === "dimension") commands.addModule(node.selection.key);
    else if (node.selection.type === "module") commands.addPractice(node.selection.key);
    else {
      commands.addQuestion(node.selection.key);
      onSelect(node.selection);
    }
  };

  const deleteNode = (node: OutlineNode) => {
    const descendants = node.selection.type === "dimension" ? "modules, practices, and questions" : node.selection.type === "module" ? "practices and questions" : "questions";
    if (node.childCount && !window.confirm(`Delete ${node.selection.type} "${node.label}" and all its ${descendants}? This cannot be undone.`)) return;
    if (node.selection.type === "dimension") commands.deleteDimension(node.selection.key);
    else if (node.selection.type === "module" && node.parentKey) commands.deleteModule(node.parentKey, node.selection.key);
    else if (node.selection.type === "practice" && node.parentKey) commands.deletePractice(node.parentKey, node.selection.key);
    setAnnouncement(`Deleted ${node.label}.`);
  };

  const move = (node: OutlineNode, direction: -1 | 1) => {
    if (node.selection.type === "dimension") commands.moveDimension(node.selection.key, direction);
    else if (node.selection.type === "module" && node.parentKey) commands.moveModule(node.parentKey, node.selection.key, direction);
    else if (node.selection.type === "practice" && node.parentKey) commands.movePractice(node.parentKey, node.selection.key, direction);
    setAnnouncement(`Moved ${node.label} ${direction === -1 ? "up" : "down"}.`);
  };

  const validDrop = activeId && drop && outlineReorderTarget(nodes, activeId, drop.id, drop.after) ? drop : null;
  const insertionLine = <div aria-hidden="true" className="relative my-0.5 h-0.5 rounded-full bg-blue-500 before:absolute before:-left-0.5 before:-top-0.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-blue-500" />;

  const renderNodes = (items: OutlineNode[], parentDragging = false) => (
    <ul className="space-y-0.5">
      {items.map((node, index) => {
        const expanded = searching || !collapsed.has(node.id);
        const dragging = parentDragging || node.id === activeId;
        return (
          <li key={node.id}>
            {validDrop?.id === node.id && !validDrop.after && insertionLine}
            <OutlineRow
              node={node} selected={node.id === selectedId} expanded={expanded}
              query={query} issues={issueMessages.get(node.id) ?? []}
              dragging={dragging} reorderDisabled={searching}
              canMoveUp={index > 0} canMoveDown={index < items.length - 1}
              onToggle={() => setCollapsed((previous) => {
                const next = new Set(previous);
                if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
                return next;
              })}
              onSelect={() => onSelect(node.selection)}
              onAdd={() => addChild(node)} onDelete={() => deleteNode(node)} onMove={(direction) => move(node, direction)}
            />
            {node.children.length > 0 && (
              <div id={`outline-children-${node.id}`} hidden={!expanded} className="ml-3 border-l border-gray-100 pl-1.5">
                {expanded && renderNodes(node.children, dragging)}
              </div>
            )}
            {validDrop?.id === node.id && validDrop.after && insertionLine}
          </li>
        );
      })}
    </ul>
  );

  const ActiveIcon = activeNode ? ICONS[activeNode.selection.type] : Box;
  return (
    <aside className="flex h-96 max-h-[calc(100dvh-7rem)] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:sticky lg:top-7 lg:h-[calc(100dvh-14rem)] lg:self-start">
      <div className="flex shrink-0 items-center justify-between px-2 py-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Model outline</h2>
        <button type="button" onClick={() => { setQuery(""); commands.addDimension(); }} title="Add dimension" aria-label="Add dimension" className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 focus-visible:outline-blue-500"><Plus className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <div className="relative mt-1 shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search model outline by name or code" placeholder="Search by name or code…" className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-8 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 [&::-webkit-search-cancel-button]:appearance-none" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear outline search" className="absolute right-1 top-1 rounded p-1.5 text-gray-400 hover:text-gray-700"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}
      </div>
      <div className="flex shrink-0 items-center gap-1 py-2 text-[11px] text-gray-500">
        <button type="button" disabled={searching || !branches.length || branches.every((node) => !collapsed.has(node.id))} onClick={() => setCollapsed(new Set())} className="rounded px-1.5 py-1 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40">Expand all</button>
        <span aria-hidden="true">·</span>
        <button type="button" disabled={searching || !branches.length || branches.every((node) => collapsed.has(node.id))} onClick={() => setCollapsed(new Set(branches.map((node) => node.id)))} className="rounded px-1.5 py-1 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40">Collapse all</button>
      </div>
      <p id="outline-interaction-hint" className="sr-only">Click to open. Drag to reorder siblings. On touch screens, hold briefly before dragging. Use the actions menu to move up or down with the keyboard.</p>
      {searching && <p role="status" className="mb-2 shrink-0 px-1 text-[11px] text-gray-500">{matches} match{matches === 1 ? "" : "es"} · Clear search to reorder</p>}
      <DndContext
        sensors={sensors} collisionDetection={collisionDetection}
        autoScroll={{ threshold: { x: 0, y: 0.15 }, canScroll: (element) => element === scrollRef.current }}
        accessibility={{
          screenReaderInstructions: { draggable: "Click to open this element. Use its actions menu to move it up or down." },
          announcements: {
            onDragStart: ({ active }) => `Dragging ${nodes.find((node) => node.id === active.id)?.label ?? "element"}. Drop among its siblings.`,
            onDragOver: () => undefined,
            onDragEnd: ({ over }) => over ? "Drag finished." : "Reorder cancelled.",
            onDragCancel: () => "Reorder cancelled.",
          },
        }}
        onDragStart={({ active }) => { setActiveId(String(active.id)); setAnnouncement(""); }}
        onDragMove={updateDrop} onDragOver={updateDrop}
        onDragCancel={clearDrag}
        onDragEnd={({ active, over }) => {
          const position = dropRef.current;
          const source = nodes.find((node) => node.id === active.id);
          if (source && over && position && position.id === over.id) {
            const target = outlineReorderTarget(nodes, String(active.id), position.id, position.after);
            if (target) reorder(source, target);
          }
          clearDrag();
        }}
      >
        <nav ref={scrollRef} aria-label="Model outline" className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 [scrollbar-gutter:stable] [&::-webkit-scrollbar-button]:hidden">
          {filtered.length ? renderNodes(filtered) : <p className="px-3 py-8 text-center text-xs leading-5 text-gray-500">{searching ? "No elements match your search." : "Add a dimension to begin."}</p>}
        </nav>
        <DragOverlay dropAnimation={null}>
          {activeNode && <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-blue-900 shadow-lg"><ActiveIcon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" /><span className="min-w-0"><span className="block truncate font-medium">{activeNode.label}</span>{activeNode.childCount > 0 && <span className="block text-[11px] text-gray-500">With {activeNode.childCount} {activeNode.childLabel}{activeNode.childCount === 1 ? "" : "s"}</span>}</span></div>}
        </DragOverlay>
      </DndContext>
      <span role="status" className="sr-only">{announcement}</span>
    </aside>
  );
}
