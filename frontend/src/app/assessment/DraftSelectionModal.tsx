"use client";

import { AssessmentResponse } from "@/api/types";
import { Button, Modal } from "@/components";

export type DraftSelection = {
  currentDraft: AssessmentResponse | null;
  legacyDrafts: AssessmentResponse[];
};

interface DraftSelectionModalProps {
  isOpen: boolean;
  modelName: string;
  activeVersion?: number;
  selection: DraftSelection | null;
  actionInProgress: number | "start-fresh" | null;
  error?: string | null;
  onClose: () => void;
  onContinueDraft: (draft: AssessmentResponse) => void;
  onStartNew: () => void;
}

export default function DraftSelectionModal({
  isOpen,
  modelName,
  activeVersion,
  selection,
  actionInProgress,
  error,
  onClose,
  onContinueDraft,
  onStartNew,
}: DraftSelectionModalProps) {
  const currentDraft = selection?.currentDraft ?? null;
  const legacyDrafts = selection?.legacyDrafts ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Saved assessment drafts found"
      maxWidth="lg"
      closeButtonDisabled={actionInProgress !== null}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={actionInProgress !== null}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={currentDraft ? "destructive" : "default"}
            onClick={onStartNew}
            disabled={actionInProgress !== null}
          >
            {actionInProgress === "start-fresh"
              ? currentDraft
                ? "Clearing saved progress..."
                : "Starting assessment..."
              : currentDraft
                ? "Clear progress and start over"
                : `Start new${activeVersion ? ` v${activeVersion}` : ""} assessment`}
          </Button>
        </div>
      }
    >
      <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1 text-sm leading-6 text-gray-600">
        {currentDraft && (
          <section>
            <h3 className="font-semibold text-gray-900">
              Current model version
            </h3>
            <p className="mt-1">
              A draft already exists for{" "}
              {activeVersion
                ? `version ${activeVersion}`
                : "the active version"}
              . Starting over will permanently clear its saved answers and
              evidence while keeping the draft available. Drafts from other
              versions will remain unchanged.
            </p>
            <DraftOption
              draft={currentDraft}
              title={`${modelName}${
                currentDraft.maturityModelVersion != null
                  ? ` (v${currentDraft.maturityModelVersion})`
                  : ""
              }`}
              buttonLabel="Continue current draft"
              actionInProgress={actionInProgress}
              current
              onContinue={onContinueDraft}
            />
          </section>
        )}

        {legacyDrafts.length > 0 && (
          <section>
            <h3 className="font-semibold text-gray-900">
              Earlier model versions
            </h3>
            <p className="mt-1">
              These drafts use inactive versions of the maturity model. You can
              continue one with its original questions, or start a new assessment
              with the active version. Starting new preserves every legacy draft.
            </p>
            <div className="mt-3 space-y-2">
              {legacyDrafts.map((draft) => (
                <DraftOption
                  key={draft.id}
                  draft={draft}
                  title={`Legacy version${
                    draft.maturityModelVersion != null
                      ? ` v${draft.maturityModelVersion}`
                      : ""
                  }`}
                  buttonLabel="Continue legacy draft"
                  actionInProgress={actionInProgress}
                  onContinue={onContinueDraft}
                />
              ))}
            </div>
          </section>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function DraftOption({
  draft,
  title,
  buttonLabel,
  actionInProgress,
  current = false,
  onContinue,
}: {
  draft: AssessmentResponse;
  title: string;
  buttonLabel: string;
  actionInProgress: number | "start-fresh" | null;
  current?: boolean;
  onContinue: (draft: AssessmentResponse) => void;
}) {
  return (
    <div
      className={
        current
          ? "mt-3 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div>
        <p
          className={
            current ? "font-medium text-blue-950" : "font-medium text-gray-900"
          }
        >
          {title}
        </p>
        <p
          className={
            current
              ? "mt-1 text-xs text-blue-800"
              : "mt-1 text-xs text-gray-600"
          }
        >
          Last saved{" "}
          {new Date(draft.updatedAt || draft.createdAt).toLocaleString()}
        </p>
      </div>
      <Button
        type="button"
        variant={current ? "default" : "outline"}
        onClick={() => onContinue(draft)}
        disabled={actionInProgress !== null}
      >
        {actionInProgress === draft.id ? "Loading..." : buttonLabel}
      </Button>
    </div>
  );
}

export function buildDraftSelection(
  drafts: AssessmentResponse[],
  activeModelId: number
): DraftSelection | null {
  const currentDraft =
    drafts.find((draft) => draft.maturityModelId === activeModelId) ?? null;
  const legacyDrafts = drafts
    .filter((draft) => draft.maturityModelId !== activeModelId)
    .sort((a, b) => {
      const versionDifference =
        (b.maturityModelVersion ?? 0) - (a.maturityModelVersion ?? 0);
      if (versionDifference !== 0) return versionDifference;
      return (
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    });

  return currentDraft || legacyDrafts.length > 0
    ? { currentDraft, legacyDrafts }
    : null;
}
