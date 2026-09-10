import type { MaturityModelEditorDocument } from "@/api/types";
import type {
  EditorEntryChoice,
  EditorNotice,
  EditorState,
  EditorStep,
  Selection,
} from "../model/editorTypes";

export type EditorAction =
  | {
      type: "initialize";
      document: MaturityModelEditorDocument;
      selection?: Selection | null;
      dirty?: boolean;
    }
  | {
      type: "replaceDocument";
      document: MaturityModelEditorDocument;
      selection?: Selection | null;
    }
  | { type: "step"; step: EditorStep }
  | { type: "select"; selection: Selection }
  | { type: "loading"; loading: boolean }
  | { type: "loadError"; message: string | null }
  | { type: "saving"; saving: boolean }
  | { type: "importing"; importing: boolean }
  | { type: "notice"; notice: EditorNotice | null }
  | { type: "entryChoice"; entryChoice: EditorEntryChoice }
  | { type: "clean" };

export function createInitialEditorState(editing: boolean): EditorState {
  return {
    document: null,
    step: "overview",
    selection: null,
    initialized: false,
    dirty: false,
    loading: editing,
    loadError: null,
    saving: false,
    importing: false,
    notice: null,
    entryChoice: editing ? "manual" : null,
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction
): EditorState {
  switch (action.type) {
    case "initialize":
      return {
        ...state,
        document: action.document,
        step: "overview",
        selection:
          action.selection ??
          (action.document.dimensions[0]
            ? {
                type: "dimension",
                key: action.document.dimensions[0].clientKey,
              }
            : null),
        initialized: true,
        dirty: action.dirty ?? false,
      };
    case "replaceDocument":
      return {
        ...state,
        document: action.document,
        selection:
          action.selection === undefined ? state.selection : action.selection,
        dirty: true,
        notice: null,
      };
    case "step":
      return { ...state, step: action.step };
    case "select":
      return { ...state, selection: action.selection };
    case "loading":
      return { ...state, loading: action.loading };
    case "loadError":
      return { ...state, loadError: action.message };
    case "saving":
      return { ...state, saving: action.saving };
    case "importing":
      return { ...state, importing: action.importing };
    case "notice":
      return { ...state, notice: action.notice };
    case "entryChoice":
      return { ...state, entryChoice: action.entryChoice };
    case "clean":
      return { ...state, dirty: false };
  }
}
