import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3Icon,
  PlusIcon,
  ChevronRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { Selection } from "../../model/editorTypes";

export default function ChildItemList({
  title,
  parentCode,
  itemType,
  items,
  onSelect,
  onMove,
  onReorder,
  onAdd,
  onDelete,
}: {
  title: string;
  parentCode: string;
  itemType: "module" | "practice";
  items: Array<{ clientKey: string; code: string; name: string }>;
  onSelect: (selection: Selection) => void;
  onMove: (itemKey: string, direction: -1 | 1) => void;
  onReorder: (activeKey: string, overKey: string) => void;
  onAdd?: () => void;
  onDelete: (itemKey: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h3 className="text-lg font-semibold tracking-tight text-gray-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Open a {itemType} to edit it. Drag the rows or use the arrows to reorder.
          </p>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Add {itemType}
          </button>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          onReorder(String(active.id), String(over.id));
        }}
      >
        <SortableContext
          items={items.map((item) => item.clientKey)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {items.map((item, index) => (
              <SortableChildItem
                key={item.clientKey}
                item={item}
                index={index}
                itemCount={items.length}
                itemType={itemType}
                parentCode={parentCode}
                onSelect={onSelect}
                onMove={onMove}
                onDelete={() => onDelete(item.clientKey)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {!items.length && (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          No {title.toLowerCase()} yet. Add a {itemType} to get started.
        </p>
      )}
    </div>
  );
}

function SortableChildItem({
  item,
  index,
  itemCount,
  itemType,
  parentCode,
  onSelect,
  onMove,
  onDelete,
}: {
  item: { clientKey: string; code: string; name: string };
  index: number;
  itemCount: number;
  itemType: "module" | "practice";
  parentCode: string;
  onSelect: (selection: Selection) => void;
  onMove: (itemKey: string, direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.clientKey });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`group relative flex items-center gap-2 rounded-xl border p-3 transition ${
        isDragging
          ? "border-blue-400 bg-blue-50 opacity-80 shadow-lg"
          : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${item.name || item.code} to reorder`}
        className="cursor-grab touch-none rounded p-2 text-gray-400 outline-none hover:bg-white hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Bars3Icon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelect({ type: itemType, key: item.clientKey })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-gray-900 group-hover:text-blue-700">
            {item.name || `Untitled ${itemType}`}
          </span>
          <span title={`${parentCode}.${item.code}`} className="mt-1 block truncate font-mono text-xs text-gray-400">
            {parentCode}.{item.code}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600">
          <span className="hidden @lg:inline">Edit</span>
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </button>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(item.clientKey, -1)}
        aria-label={`Move ${item.name || item.code} up`}
        title="Move up"
        className="rounded p-2 text-gray-400 outline-none hover:bg-white hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={index === itemCount - 1}
        onClick={() => onMove(item.clientKey, 1)}
        aria-label={`Move ${item.name || item.code} down`}
        title="Move down"
        className="rounded p-2 text-gray-400 outline-none hover:bg-white hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowDownIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={itemCount <= 1}
        onClick={onDelete}
        aria-label={`Delete ${itemType} ${item.name || item.code}`}
        title={`Delete ${itemType}`}
        className="rounded p-2 text-gray-400 outline-none hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <TrashIcon aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
