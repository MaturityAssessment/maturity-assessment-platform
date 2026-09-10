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
import { Bars3Icon } from "@heroicons/react/24/outline";
import type { ModelEditorQuestion } from "@/api/types";

export default function QuestionReorderList({
  questions,
  onReorder,
}: {
  questions: ModelEditorQuestion[];
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        onReorder(String(active.id), String(over.id));
      }}
    >
      <SortableContext
        items={questions.map((question) => question.clientKey)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          {questions.map((question, questionIndex) => (
            <SortableQuestionOrderItem
              key={question.clientKey}
              question={question}
              questionIndex={questionIndex}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableQuestionOrderItem({
  question,
  questionIndex,
}: {
  question: ModelEditorQuestion;
  questionIndex: number;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.clientKey });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`relative flex min-h-16 items-center gap-3 rounded-md border bg-white px-3 py-2 shadow-sm ${
        isDragging
          ? "z-20 border-blue-400 opacity-80 shadow-lg"
          : "border-gray-200"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${question.text || `question ${questionIndex + 1}`} to reorder`}
        className="cursor-grab touch-none rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
        {questionIndex + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900">
          {question.text || `Question ${questionIndex + 1}`}
        </span>
        <span className="mt-0.5 block truncate font-mono text-xs text-gray-500">
          {question.code} · {question.type}
        </span>
      </span>
    </div>
  );
}
