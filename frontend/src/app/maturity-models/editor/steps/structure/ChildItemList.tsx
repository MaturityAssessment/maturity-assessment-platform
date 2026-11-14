import ElementListFrame from "./ElementListFrame";
import ChildListActions from "./ChildListActions";
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
  Bars3Icon,
  PlusIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { Selection } from "../../model/editorTypes";
import ChildWeightField from "../../components/ChildWeightField";

type ChildItem = { clientKey: string; code: string; name: string; weight: number; practices?: unknown[]; questions?: unknown[]; visible?: boolean };

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
  onWeightChange,
}: {
  title: string;
  parentCode: string;
  itemType: "module" | "practice";
  items: ChildItem[];
  onWeightChange?: (itemKey: string, weight: number) => void;
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
            {onWeightChange ? "Drag to reorder, or use the arrows. Set each item’s relative weight here." : "Open an item to edit it. Drag to reorder, or use the arrows."}
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
          <ElementListFrame label={itemType === "module" ? "Module" : "Practice"} weighted={!!onWeightChange}>
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
                onWeightChange={onWeightChange ? (weight) => onWeightChange(item.clientKey, weight) : undefined}
              />
            ))}
          </ElementListFrame>
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
  onWeightChange,
}: {
  item: ChildItem;
  onWeightChange?: (weight: number) => void;
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
      className={`group relative grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-4 py-4 transition motion-reduce:transition-none first:rounded-t-xl last:rounded-b-xl ${onWeightChange ? "@lg:grid-cols-[2.5rem_minmax(0,1fr)_5rem_7rem]" : "@lg:grid-cols-[2.5rem_minmax(0,1fr)_7rem]"} ${isDragging ? "z-20 bg-blue-50 shadow-lg" : "bg-white hover:bg-gray-50/70"}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${item.name || item.code} to reorder`}
        className="col-start-1 row-start-1 flex cursor-grab touch-none flex-col items-center gap-1 self-start rounded-lg px-1 py-2 text-gray-400 outline-none hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-gray-500">{index + 1}</span>
        <Bars3Icon aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onSelect({ type: itemType, key: item.clientKey })}
        className="col-start-2 row-start-1 flex min-w-0 items-center gap-3 rounded-lg px-1 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-gray-900 group-hover:text-blue-700">
            {item.name || `Untitled ${itemType}`}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span title={`${parentCode}.${item.code}`} className="font-mono text-[11px] [overflow-wrap:anywhere]">{item.code}</span>
            {itemType === "module" && item.practices && <span>{item.practices.length} practice{item.practices.length === 1 ? "" : "s"}</span>}
            {itemType === "practice" && item.questions && <span>{item.questions.length} question{item.questions.length === 1 ? "" : "s"}</span>}
            {item.visible === false && <span className="text-amber-800">Hidden from assessments</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600">
          <span className="hidden @xl:inline">Open</span>
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </button>
      {onWeightChange && (
        <ChildWeightField
          compact
          id={`${itemType}-${item.clientKey}-weight`}
          name={item.name || item.code}
          value={item.weight}
          onChange={onWeightChange}
        />
      )}
      <ChildListActions
        weighted={!!onWeightChange}
        name={item.name || item.code}
        canMoveUp={index > 0}
        canMoveDown={index < itemCount - 1}
        canDelete={itemCount > 1}
        onMoveUp={() => onMove(item.clientKey, -1)}
        onMoveDown={() => onMove(item.clientKey, 1)}
        onDelete={onDelete}
      />
    </div>
  );
}
