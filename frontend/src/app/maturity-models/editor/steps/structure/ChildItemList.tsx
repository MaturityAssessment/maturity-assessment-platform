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
}: {
  title: string;
  parentCode: string;
  itemType: "module" | "practice";
  items: Array<{ clientKey: string; code: string; name: string }>;
  onSelect: (selection: Selection) => void;
  onMove: (itemKey: string, direction: -1 | 1) => void;
  onReorder: (activeKey: string, overKey: string) => void;
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
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
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
          <div className="mt-2 space-y-2">
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
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
}: {
  item: { clientKey: string; code: string; name: string };
  index: number;
  itemCount: number;
  itemType: "module" | "practice";
  parentCode: string;
  onSelect: (selection: Selection) => void;
  onMove: (itemKey: string, direction: -1 | 1) => void;
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
      className={`group relative flex items-center gap-2 rounded-md border p-2 transition ${
        isDragging
          ? "border-blue-400 bg-blue-50 opacity-80 shadow-lg"
          : "border-gray-200 bg-gray-50 hover:border-blue-200 hover:bg-blue-50"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${item.name || item.code} to reorder`}
        className="cursor-grab touch-none rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Bars3Icon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onSelect({ type: itemType, key: item.clientKey })}
        className="min-w-0 flex-1 px-1 py-1 text-left"
      >
        <span className="block font-mono text-xs font-semibold text-blue-700">
          {parentCode}.{item.code}
        </span>
        <span className="mt-0.5 block truncate text-sm text-gray-700">
          {item.name || `*Untitled ${itemType}`}
        </span>
      </button>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(item.clientKey, -1)}
        aria-label={`Move ${item.name || item.code} up`}
        className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={index === itemCount - 1}
        onClick={() => onMove(item.clientKey, 1)}
        aria-label={`Move ${item.name || item.code} down`}
        className="rounded p-1.5 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
      >
        <ArrowDownIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
