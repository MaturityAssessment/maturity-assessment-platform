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
import { ArrowDownIcon, ArrowUpIcon, Bars3Icon, ChevronRightIcon, LinkIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { EditorIssue } from "../../model/editorTypes";
import type { ModelEditorQuestion } from "@/api/types";

const answerTypeLabels: Record<string, string> = {
  boolean: "Yes / No",
  likert: "Scale",
  multiple_choice: "Multiple choice",
  multiple_selection: "Multiple selection",
  open_answer: "Open answer",
};

export default function QuestionReorderList({
  questions,
  issues = [],
  onReorder,
  onSelect,
  onDelete,
}: {
  questions: ModelEditorQuestion[];
  issues?: EditorIssue[];
  onSelect: (questionKey: string) => void;
  onReorder: (activeKey: string, overKey: string) => void;
  onDelete: (question: ModelEditorQuestion) => void;
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
        <div className="space-y-3">
          {questions.map((question, questionIndex) => (
            <SortableQuestionOrderItem
              key={question.clientKey}
              question={question}
              issues={issues.filter((issue) => issue.questionKey === question.clientKey)}
              questionIndex={questionIndex}
              questionCount={questions.length}
              onMove={(direction) => {
                const target = questions[questionIndex + direction];
                if (target) onReorder(question.clientKey, target.clientKey);
              }}
              onSelect={() => onSelect(question.clientKey)}
              onDelete={() => onDelete(question)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableQuestionOrderItem({
  question,
  issues,
  questionIndex,
  questionCount,
  onMove,
  onSelect,
  onDelete,
}: {
  question: ModelEditorQuestion;
  issues: EditorIssue[];
  questionIndex: number;
  questionCount: number;
  onMove: (direction: -1 | 1) => void;
  onSelect: () => void;
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
  } = useSortable({ id: question.clientKey });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`group relative flex items-center gap-2 rounded-xl border p-3 transition motion-reduce:transition-none ${
        isDragging
          ? "border-blue-400 bg-blue-50 opacity-80 shadow-lg"
          : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${question.text || `question ${questionIndex + 1}`} to reorder`}
        className="shrink-0 cursor-grab touch-none rounded p-2 text-gray-400 outline-none hover:bg-white hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Bars3Icon aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        aria-haspopup="dialog"
        aria-label={`Edit question ${questionIndex + 1}: ${question.text || "Untitled question"}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="min-w-0 flex-1">
          <span title={question.text || "Untitled question"} className="block truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
            {question.text || "Untitled question"}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-5 text-gray-500">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
              {answerTypeLabels[question.type] ?? question.type.replaceAll("_", " ")}
            </span>
            <span className="font-mono text-[11px] [overflow-wrap:anywhere]">{question.code}</span>
            <span>{question.required ? "Required" : "Optional"}</span>
            <span>Weight {Number.isFinite(question.weight) ? question.weight : "missing"}</span>
            {question.dependsOnQuestionCode && (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-gray-600">
                <LinkIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">Depends on {question.dependsOnQuestionCode}</span>
              </span>
            )}
          </span>
          {issues.length > 0 && (
            <span className="mt-2 block text-xs text-amber-800">
              <span className="font-semibold">⚠ {issues.length} issue{issues.length === 1 ? "" : "s"}: </span>
              {issues.map((issue) => issue.message).join(" ")}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600">
          <span>Edit</span>
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </span>
      </button>
      <button
        type="button"
        disabled={questionIndex === 0}
        onClick={() => onMove(-1)}
        aria-label={`Move question ${questionIndex + 1} up`}
        title="Move up"
        className="shrink-0 rounded p-2 text-gray-400 outline-none hover:bg-white hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowUpIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={questionIndex === questionCount - 1}
        onClick={() => onMove(1)}
        aria-label={`Move question ${questionIndex + 1} down`}
        title="Move down"
        className="shrink-0 rounded p-2 text-gray-400 outline-none hover:bg-white hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowDownIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={questionCount <= 1}
        onClick={onDelete}
        aria-label={`Delete question ${questionIndex + 1}`}
        title="Delete question"
        className="shrink-0 rounded p-2 text-gray-400 outline-none hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <TrashIcon aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
