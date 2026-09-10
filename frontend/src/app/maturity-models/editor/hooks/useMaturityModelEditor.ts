"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/api/axios";
import type {
  Domain,
  MaturityModel,
  MaturityModelEditorDocument,
  MaturityModelEditorImportResponse,
  ModelEditorDimension,
  ModelEditorModule,
  ModelEditorPractice,
  ModelEditorQuestion,
} from "@/api/types";
import { useAuth } from "@/context";
import {
  createEmptyDocument,
  hydrateDocument,
  serializeDocument,
} from "../model/editorDocument";
import {
  addDimension,
  addModule,
  addPractice,
  addQuestion,
  deleteDimension,
  deleteModule,
  deletePractice,
  deleteQuestion,
  findDimension,
  findModule,
  moveDimension,
  moveModule,
  movePractice,
  moveQuestion,
  reorderModule,
  reorderPractice,
  reorderQuestion,
  updateDimension,
  updateModule,
  updatePractice,
  updateQuestion,
} from "../model/editorMutations";
import {
  EDITOR_STEPS,
  type EditorIssue,
  type EditorStep,
  type Selection,
  type StructureEditorCommands,
} from "../model/editorTypes";
import { validateDocument } from "../model/editorValidation";
import {
  createInitialEditorState,
  editorReducer,
} from "../state/editorReducer";
import { useEditorDraft } from "./useEditorDraft";
import {
  confirmLeaveEditor,
  useUnsavedNavigationGuard,
} from "./useUnsavedNavigationGuard";

function errorMessage(error: any, fallback: string) {
  const data = error?.response?.data;
  return data?.message || data?.errorDetails || error?.errorMessage || fallback;
}

export function useMaturityModelEditor(
  sourceModelId?: string,
  returnHref?: string
) {
  const router = useRouter();
  const { user } = useAuth();
  const editing = Boolean(sourceModelId);
  const [state, dispatch] = useReducer(
    editorReducer,
    editing,
    createInitialEditorState
  );
  const [domains, setDomains] = useState<Domain[]>([]);

  const draftKey = useMemo(
    () =>
      `maturity-model-editor:v1:${user?.id ?? user?.email ?? "anonymous"}:${
        sourceModelId ? `edit:${sourceModelId}` : "new"
      }`,
    [sourceModelId, user?.email, user?.id]
  );
  const { clearDraft, readDraft } = useEditorDraft({
    draftKey,
    document: state.document,
    initialized: state.initialized,
    dirty: state.dirty,
  });
  useUnsavedNavigationGuard(state.dirty);

  const initialize = useCallback(
    (
      document: MaturityModelEditorDocument,
      lockCodes: boolean,
      dirty = false
    ) => {
      dispatch({
        type: "initialize",
        document: hydrateDocument(document, lockCodes),
        dirty,
      });
    },
    []
  );

  useEffect(() => {
    apiClient
      .get<Domain[]>("/api/v1/domain")
      .then((response) => setDomains(response.data))
      .catch(() =>
        dispatch({
          type: "notice",
          notice: { type: "error", message: "Could not load domains." },
        })
      );
  }, []);

  useEffect(() => {
    if (!editing || !sourceModelId) return;
    dispatch({ type: "loading", loading: true });
    apiClient
      .get<MaturityModelEditorDocument>(
        `/api/v1/maturity-model/${sourceModelId}/editor`
      )
      .then((response) => {
        const saved = readDraft();
        if (saved) {
          const resume = window.confirm(
            "A browser draft exists for this model. Select OK to resume it, or Cancel to discard it and load the saved model."
          );
          if (resume) {
            initialize(saved, true);
            dispatch({
              type: "notice",
              notice: { type: "success", message: "Browser draft restored." },
            });
            return;
          }
          clearDraft();
        }
        initialize(response.data, true);
      })
      .catch((error) =>
        dispatch({
          type: "loadError",
          message: errorMessage(error, "Could not load this model."),
        })
      )
      .finally(() => dispatch({ type: "loading", loading: false }));
  }, [
    clearDraft,
    editing,
    initialize,
    readDraft,
    sourceModelId,
  ]);

  useEffect(() => {
    if (editing || state.initialized || !state.entryChoice) return;
    if (state.entryChoice === "manual") {
      const saved = readDraft();
      if (saved) {
        const resume = window.confirm(
          "A browser draft exists. Select OK to resume it, or Cancel to start again."
        );
        if (resume) {
          initialize(saved, false);
          dispatch({
            type: "notice",
            notice: { type: "success", message: "Browser draft restored." },
          });
          return;
        }
        clearDraft();
      }
      initialize(createEmptyDocument(), false);
    }
  }, [
    clearDraft,
    editing,
    initialize,
    readDraft,
    state.entryChoice,
    state.initialized,
  ]);

  const issues = useMemo(
    () => (state.document ? validateDocument(state.document) : []),
    [state.document]
  );
  const errors = useMemo(
    () => issues.filter((issue) => issue.severity === "error"),
    [issues]
  );
  const issueCountByStep = useMemo(
    () =>
      EDITOR_STEPS.reduce<Record<EditorStep, number>>(
        (counts, step) => {
          counts[step.id] = issues.filter(
            (issue) =>
              issue.step === step.id && issue.severity === "error"
          ).length;
          return counts;
        },
        { overview: 0, scale: 0, structure: 0, review: 0 }
      ),
    [issues]
  );

  const replaceDocument = useCallback(
    (
      document: MaturityModelEditorDocument,
      selection?: Selection | null
    ) => {
      dispatch({ type: "replaceDocument", document, selection });
    },
    []
  );

  const withDocument = useCallback(
    (
      mutation: (
        document: MaturityModelEditorDocument
      ) => MaturityModelEditorDocument,
      selection?: Selection | null
    ) => {
      if (!state.document) return;
      replaceDocument(mutation(state.document), selection);
    },
    [replaceDocument, state.document]
  );

  const structureCommands = useMemo<StructureEditorCommands>(
    () => ({
      addDimension: () => {
        if (!state.document) return;
        const result = addDimension(state.document);
        replaceDocument(result.document, {
          type: "dimension",
          key: result.dimension.clientKey,
        });
      },
      updateDimension: (
        dimensionKey: string,
        dimension: ModelEditorDimension
      ) =>
        withDocument((document) =>
          updateDimension(document, dimensionKey, dimension)
        ),
      moveDimension: (dimensionKey: string, direction: -1 | 1) =>
        withDocument((document) =>
          moveDimension(document, dimensionKey, direction)
        ),
      deleteDimension: (dimensionKey: string) => {
        if (!state.document) return;
        const next = deleteDimension(state.document, dimensionKey);
        const first = next.dimensions[0];
        replaceDocument(
          next,
          first ? { type: "dimension", key: first.clientKey } : undefined
        );
      },
      addModule: (dimensionKey: string) =>
        withDocument((document) => addModule(document, dimensionKey)),
      updateModule: (
        dimensionKey: string,
        moduleKey: string,
        module: ModelEditorModule
      ) =>
        withDocument((document) =>
          updateModule(document, dimensionKey, moduleKey, module)
        ),
      moveModule: (
        dimensionKey: string,
        moduleKey: string,
        direction: -1 | 1
      ) =>
        withDocument((document) =>
          moveModule(document, dimensionKey, moduleKey, direction)
        ),
      reorderModule: (
        dimensionKey: string,
        activeKey: string,
        overKey: string
      ) =>
        withDocument((document) =>
          reorderModule(document, dimensionKey, activeKey, overKey)
        ),
      deleteModule: (dimensionKey: string, moduleKey: string) => {
        if (!state.document) return;
        const dimension = findDimension(state.document, dimensionKey);
        const next = deleteModule(state.document, dimensionKey, moduleKey);
        replaceDocument(
          next,
          dimension
            ? { type: "dimension", key: dimension.clientKey }
            : undefined
        );
      },
      addPractice: (moduleKey: string) =>
        withDocument((document) => addPractice(document, moduleKey)),
      updatePractice: (
        moduleKey: string,
        practiceKey: string,
        practice: ModelEditorPractice
      ) =>
        withDocument((document) =>
          updatePractice(document, moduleKey, practiceKey, practice)
        ),
      movePractice: (
        moduleKey: string,
        practiceKey: string,
        direction: -1 | 1
      ) =>
        withDocument((document) =>
          movePractice(document, moduleKey, practiceKey, direction)
        ),
      reorderPractice: (
        moduleKey: string,
        activeKey: string,
        overKey: string
      ) =>
        withDocument((document) =>
          reorderPractice(document, moduleKey, activeKey, overKey)
        ),
      deletePractice: (moduleKey: string, practiceKey: string) => {
        if (!state.document) return;
        const result = findModule(state.document, moduleKey);
        const next = deletePractice(state.document, moduleKey, practiceKey);
        replaceDocument(
          next,
          result ? { type: "module", key: result.module.clientKey } : undefined
        );
      },
      addQuestion: (practiceKey: string) =>
        withDocument((document) => addQuestion(document, practiceKey)),
      updateQuestion: (
        practiceKey: string,
        questionKey: string,
        question: ModelEditorQuestion
      ) =>
        withDocument((document) =>
          updateQuestion(document, practiceKey, questionKey, question)
        ),
      moveQuestion: (
        practiceKey: string,
        questionKey: string,
        direction: -1 | 1
      ) =>
        withDocument((document) =>
          moveQuestion(document, practiceKey, questionKey, direction)
        ),
      reorderQuestion: (
        practiceKey: string,
        activeKey: string,
        overKey: string
      ) =>
        withDocument((document) =>
          reorderQuestion(document, practiceKey, activeKey, overKey)
        ),
      deleteQuestion: (practiceKey: string, questionKey: string) =>
        withDocument((document) =>
          deleteQuestion(document, practiceKey, questionKey)
        ),
    }),
    [replaceDocument, state.document, withDocument]
  );

  const importWorkbook = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        dispatch({
          type: "notice",
          notice: { type: "error", message: "Select an .xlsx workbook." },
        });
        return false;
      }
      if (
        editing &&
        state.dirty &&
        !window.confirm(
          "Importing will replace the current unsaved editor draft. Continue?"
        )
      ) {
        return false;
      }
      dispatch({ type: "importing", importing: true });
      dispatch({ type: "notice", notice: null });
      try {
        const body = new FormData();
        body.append("file", file);
        if (state.document?.domainId) {
          body.append("domainId", String(state.document.domainId));
        }
        const response =
          await apiClient.post<MaturityModelEditorImportResponse>(
            "/api/v1/maturity-model/editor/parse-upload",
            body
          );
        if (!response.data.success || !response.data.document) {
          throw new Error(
            response.data.errorDetails || response.data.message
          );
        }
        const imported = hydrateDocument(
          response.data.document as MaturityModelEditorDocument,
          editing
        );
        if (editing && state.document?.domainId && !imported.domainId) {
          imported.domainId = state.document.domainId;
        }
        dispatch({ type: "initialize", document: imported, dirty: true });
        dispatch({ type: "entryChoice", entryChoice: "manual" });
        dispatch({
          type: "notice",
          notice: {
            type: "warning",
            message:
              response.data.warnings?.join(" ") ||
              "Workbook loaded. Review it before saving.",
          },
        });
      } catch (error: any) {
        dispatch({
          type: "notice",
          notice: {
            type: "error",
            message:
              error?.message ||
              errorMessage(error, "Could not load this workbook."),
          },
        });
      } finally {
        dispatch({ type: "importing", importing: false });
      }
      return true;
    },
    [editing, state.dirty, state.document]
  );

  const selectIssue = useCallback((issue: EditorIssue) => {
    dispatch({ type: "step", step: issue.step });
    if (issue.selection) {
      dispatch({ type: "select", selection: issue.selection });
    }
    if (issue.field) {
      window.setTimeout(
        () => document.getElementById(issue.field!)?.focus(),
        50
      );
    }
  }, []);

  const save = useCallback(async () => {
    if (!state.document) return;
    if (errors.length) {
      dispatch({
        type: "notice",
        notice: {
          type: "error",
          message: `Resolve ${errors.length} blocking issue${
            errors.length === 1 ? "" : "s"
          } before saving.`,
        },
      });
      dispatch({ type: "step", step: "review" });
      return;
    }
    dispatch({ type: "saving", saving: true });
    dispatch({ type: "notice", notice: null });
    try {
      const payload = serializeDocument(state.document);
      const response = editing
        ? await apiClient.post<MaturityModel>(
            `/api/v1/maturity-model/${sourceModelId}/versions/editor`,
            payload
          )
        : await apiClient.post<MaturityModel>(
            "/api/v1/maturity-model/editor",
            payload
          );
      clearDraft();
      dispatch({ type: "clean" });
      const modelRootId = response.data.baseModelId ?? response.data.id;
      router.push(
        `/maturity-models/${modelRootId}/versions/${response.data.id}`
      );
    } catch (error) {
      dispatch({
        type: "notice",
        notice: {
          type: "error",
          message: errorMessage(
            error,
            editing
              ? "Could not create the new model version."
              : "Could not create the maturity model."
          ),
        },
      });
    } finally {
      dispatch({ type: "saving", saving: false });
    }
  }, [
    clearDraft,
    editing,
    errors.length,
    router,
    sourceModelId,
    state.document,
  ]);

  const cancel = useCallback(() => {
    if (state.dirty && !confirmLeaveEditor()) return;
    router.push(
      editing && returnHref
        ? returnHref
        : editing && sourceModelId
        ? `/maturity-models/${sourceModelId}`
        : "/maturity-models"
    );
  }, [editing, returnHref, router, sourceModelId, state.dirty]);

  const setStep = useCallback((step: EditorStep) => {
    dispatch({ type: "step", step });
  }, []);
  const select = useCallback((selection: Selection) => {
    dispatch({ type: "select", selection });
  }, []);
  const selectManual = useCallback(() => {
    dispatch({ type: "entryChoice", entryChoice: "manual" });
  }, []);
  const dismissNotice = useCallback(() => {
    dispatch({ type: "notice", notice: null });
  }, []);

  return {
    state,
    editing,
    domains,
    issues,
    errors,
    issueCountByStep,
    structureCommands,
    replaceDocument,
    setStep,
    select,
    selectManual,
    dismissNotice,
    importWorkbook,
    selectIssue,
    save,
    cancel,
  };
}
