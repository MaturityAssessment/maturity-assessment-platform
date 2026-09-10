import type {
  MaturityModelEditorDocument,
  ModelEditorDimension,
  ModelEditorModule,
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import type { NoticeType } from "@/components";

export type EditorStep = "overview" | "scale" | "structure" | "review";

export type Selection =
  | { type: "dimension"; key: string }
  | { type: "module"; key: string }
  | { type: "practice"; key: string };

export type EditorIssue = {
  id: string;
  step: EditorStep;
  severity: "error" | "warning";
  message: string;
  selection?: Selection;
  field?: string;
};

export type EditorNotice = {
  type: NoticeType;
  message: string;
};

export type EditorEntryChoice = "manual" | "excel" | null;

export type EditorState = {
  document: MaturityModelEditorDocument | null;
  step: EditorStep;
  selection: Selection | null;
  initialized: boolean;
  dirty: boolean;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  importing: boolean;
  notice: EditorNotice | null;
  entryChoice: EditorEntryChoice;
};

export type StructureEditorCommands = {
  addDimension: () => void;
  updateDimension: (
    dimensionKey: string,
    dimension: ModelEditorDimension
  ) => void;
  moveDimension: (dimensionKey: string, direction: -1 | 1) => void;
  deleteDimension: (dimensionKey: string) => void;
  addModule: (dimensionKey: string) => void;
  updateModule: (
    dimensionKey: string,
    moduleKey: string,
    module: ModelEditorModule
  ) => void;
  moveModule: (
    dimensionKey: string,
    moduleKey: string,
    direction: -1 | 1
  ) => void;
  reorderModule: (
    dimensionKey: string,
    activeKey: string,
    overKey: string
  ) => void;
  deleteModule: (dimensionKey: string, moduleKey: string) => void;
  addPractice: (moduleKey: string) => void;
  updatePractice: (
    moduleKey: string,
    practiceKey: string,
    practice: ModelEditorPractice
  ) => void;
  movePractice: (
    moduleKey: string,
    practiceKey: string,
    direction: -1 | 1
  ) => void;
  reorderPractice: (
    moduleKey: string,
    activeKey: string,
    overKey: string
  ) => void;
  deletePractice: (moduleKey: string, practiceKey: string) => void;
  addQuestion: (practiceKey: string) => void;
  updateQuestion: (
    practiceKey: string,
    questionKey: string,
    question: ModelEditorQuestion
  ) => void;
  moveQuestion: (
    practiceKey: string,
    questionKey: string,
    direction: -1 | 1
  ) => void;
  reorderQuestion: (
    practiceKey: string,
    activeKey: string,
    overKey: string
  ) => void;
  deleteQuestion: (practiceKey: string, questionKey: string) => void;
};

export const EDITOR_STEPS: Array<{
  id: EditorStep;
  label: string;
  description: string;
}> = [
  { id: "overview", label: "Overview", description: "Purpose and ownership" },
  { id: "scale", label: "Scale", description: "Maturity levels" },
  { id: "structure", label: "Structure", description: "Model content" },
  { id: "review", label: "Review", description: "Checks and save" },
];
