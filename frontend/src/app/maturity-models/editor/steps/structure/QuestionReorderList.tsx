import ElementListFrame from "./ElementListFrame";
import { dependencySummary } from "@/lib/questionDependencies";
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
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, LinkIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { EditorIssue } from "../../model/editorTypes";
import type { ModelEditorQuestion } from "@/api/types";
import ChildWeightField from "../../components/ChildWeightField";

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
  onWeightChange,
}: {
  questions: ModelEditorQuestion[];
  issues?: EditorIssue[];
  onSelect: (questionKey: string) => void;
  onReorder: (activeKey: string, overKey: string) => void;
  onDelete: (question: ModelEditorQuestion) => void;
  onWeightChange?: (questionKey: string, weight: number) => void;
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
        <ElementListFrame questionLayout label="Question" weighted={!!onWeightChange}>
          {questions.map((question, questionIndex) => (
            <SortableQuestionOrderItem
              key={question.clientKey}
              question={question}
              dependencyText={dependencySummary(questions.find((candidate) => candidate.code.toLowerCase() === question.dependsOnQuestionCode?.toLowerCase()), question.dependencyCondition)}
              issues={issues.filter((issue) => issue.questionKey === question.clientKey)}
              questionIndex={questionIndex}
              questionCount={questions.length}
              onMove={(direction) => {
                const target = questions[questionIndex + direction];
                if (target) onReorder(question.clientKey, target.clientKey);
              }}
              onSelect={() => onSelect(question.clientKey)}
              onDelete={() => onDelete(question)}
              onWeightChange={onWeightChange ? (weight) => onWeightChange(question.clientKey, weight) : undefined}
            />
          ))}
        </ElementListFrame>
      </SortableContext>
    </DndContext>
  );
}

function SortableQuestionOrderItem({
  question,
  dependencyText,
  issues,
  questionIndex,
  questionCount,
  onMove,
  onSelect,
  onDelete,
  onWeightChange,
}: {
  question: ModelEditorQuestion;
  dependencyText: string;
  issues: EditorIssue[];
  questionIndex: number;
  questionCount: number;
  onMove: (direction: -1 | 1) => void;
  onSelect: () => void;
  onDelete: () => void;
  onWeightChange?: (weight: number) => void;
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
      className={`group relative grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-4 py-4 transition motion-reduce:transition-none first:rounded-t-xl last:rounded-b-xl ${onWeightChange ? "@lg:grid-cols-[2rem_minmax(0,1fr)_5rem_2rem]" : "@lg:grid-cols-[2rem_minmax(0,1fr)_2rem]"} ${isDragging ? "z-20 bg-blue-50 shadow-lg" : "bg-white hover:bg-gray-50/70"}`}
    >
      <div className="col-start-1 row-start-1 flex flex-col items-center">
        <button type="button" disabled={questionIndex === 0} onClick={() => onMove(-1)}
          aria-label={`Move question ${questionIndex + 1} up`} title="Move up"
          className="flex h-6 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-20">
          <ChevronUpIcon aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Question ${questionIndex + 1}. Drag to reorder`}
          title="Drag this number to reorder"
          className="flex h-6 w-8 cursor-grab touch-none items-center justify-center rounded text-sm font-medium tabular-nums text-gray-500 outline-none hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          {questionIndex + 1}
        </button>
        <button type="button" disabled={questionIndex === questionCount - 1} onClick={() => onMove(1)}
          aria-label={`Move question ${questionIndex + 1} down`} title="Move down"
          className="flex h-6 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-20">
          <ChevronDownIcon aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onSelect}
        aria-haspopup="dialog"
        aria-label={`Edit question ${questionIndex + 1}: ${question.text || "Untitled question"}`}
        className="group/question col-start-2 row-start-1 flex min-w-0 items-center gap-3 rounded-lg px-1 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="min-w-0 flex-1">
          <span title={question.text || "Untitled question"} className="block truncate text-sm font-medium leading-6 text-gray-900 group-hover/question:text-blue-700">
            {question.text || "Untitled question"}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-5 text-gray-500">
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
              {answerTypeLabels[question.type] ?? question.type.replaceAll("_", " ")}
            </span>
            <span className="font-mono text-[11px] [overflow-wrap:anywhere]">{question.code}</span>
            <span>{question.required ? "Required" : "Optional"}</span>
            {question.dependsOnQuestionCode && (
              <span className="inline-flex min-w-0 items-center gap-1.5 text-gray-600">
                <LinkIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">{dependencyText}</span>
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
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-gray-400 group-hover/question:text-blue-600">
          <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
        </span>
      </button>
      {onWeightChange && (
        <ChildWeightField
          compact
          id={`question-${question.clientKey}-weight`}
          name={question.text || question.code}
          value={question.weight}
          allowZero={!question.required}
          onChange={onWeightChange}
        />
      )}
      <button type="button" disabled={questionCount <= 1} onClick={onDelete}
        aria-label={`Delete question ${questionIndex + 1}`} title="Delete question"
        className={`col-start-2 row-start-2 justify-self-end rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-25 ${onWeightChange ? "@lg:col-start-4" : "@lg:col-start-3"} @lg:row-start-1`}>
        <TrashIcon aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
