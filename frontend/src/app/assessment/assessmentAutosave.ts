import type {
  AssessmentEvidenceInputItem,
  Evidence,
} from "@/api/types";
import type { AssessmentEvidenceByField } from "./assessmentEvidence";

export type AssessmentSaveStatus = "saved" | "saving" | "error";

type SingleFlightAutosaveQueueOptions = {
  getRevision: () => number;
  save: (requestedRevision: number) => Promise<number>;
  onSaving?: () => void;
  onSaved?: (revision: number) => void;
  onError?: (error: unknown) => void;
};

/**
 * Serializes saves and keeps draining when edits arrive during a request.
 * The React hook owns debounce timing; this queue owns request ordering.
 */
export class SingleFlightAutosaveQueue {
  private activeDrain: Promise<boolean> | null = null;
  private savedRevision = 0;
  private readonly options: SingleFlightAutosaveQueueOptions;

  constructor(options: SingleFlightAutosaveQueueOptions) {
    this.options = options;
  }

  getSavedRevision() {
    return this.savedRevision;
  }

  drain(): Promise<boolean> {
    if (this.activeDrain) return this.activeDrain;

    const activeDrain = this.run().finally(() => {
      if (this.activeDrain === activeDrain) {
        this.activeDrain = null;
      }
    });
    this.activeDrain = activeDrain;
    return activeDrain;
  }

  private async run() {
    while (this.options.getRevision() > this.savedRevision) {
      const requestedRevision = this.options.getRevision();
      this.options.onSaving?.();

      try {
        const committedRevision =
          await this.options.save(requestedRevision);
        this.savedRevision = Math.max(
          this.savedRevision,
          committedRevision
        );
        this.options.onSaved?.(this.savedRevision);
      } catch (error) {
        this.options.onError?.(error);
        return false;
      }
    }

    return true;
  }
}

export function cloneEvidenceSnapshot(
  evidence: AssessmentEvidenceByField
): AssessmentEvidenceByField {
  return new Map(
    Array.from(evidence, ([field, items]) => [
      field,
      items.map((item) => ({ ...item })),
    ])
  );
}

/**
 * Applies server-generated evidence IDs and file metadata to the latest local
 * state without restoring removed items or overwriting edits made while an
 * upload was in flight.
 */
export function reconcileSavedEvidence(
  sentEvidence: AssessmentEvidenceByField,
  currentEvidence: AssessmentEvidenceByField,
  persistedEvidence: Evidence[] | null | undefined
): AssessmentEvidenceByField {
  const sentByClientKey = indexEvidenceItems(sentEvidence);
  const persistedByClientKey = new Map(
    (persistedEvidence || [])
      .filter(
        (item): item is Evidence & { clientKey: string } =>
          typeof item.clientKey === "string" && item.clientKey.length > 0
      )
      .map((item) => [item.clientKey, item])
  );
  const persistedById = new Map(
    (persistedEvidence || []).map((item) => [item.id, item])
  );

  return new Map(
    Array.from(currentEvidence, ([field, items]) => [
      field,
      items.map((currentItem) => {
        const sentItem = sentByClientKey.get(currentItem.id);
        if (!sentItem) return currentItem;

        const persisted =
          persistedByClientKey.get(currentItem.id) ??
          (currentItem.evidenceId
            ? persistedById.get(currentItem.evidenceId)
            : undefined);
        if (!persisted) return currentItem;

        return reconcileEvidenceItem(sentItem, currentItem, persisted);
      }),
    ])
  );
}

function indexEvidenceItems(evidence: AssessmentEvidenceByField) {
  const result = new Map<string, AssessmentEvidenceInputItem>();
  evidence.forEach((items) => {
    items.forEach((item) => result.set(item.id, item));
  });
  return result;
}

function reconcileEvidenceItem(
  sent: AssessmentEvidenceInputItem,
  current: AssessmentEvidenceInputItem,
  persisted: Evidence
): AssessmentEvidenceInputItem {
  const description =
    current.description === sent.description
      ? persisted.description || ""
      : current.description;

  if (current.type === "link") {
    return {
      ...current,
      evidenceId: persisted.id,
      description,
      url:
        current.url === sent.url ? persisted.url || "" : current.url,
      downloadUrl: undefined,
    };
  }

  const fileChangedDuringSave = current.file !== sent.file;
  return {
    ...current,
    evidenceId: persisted.id,
    description,
    file: fileChangedDuringSave ? current.file : null,
    fileName: fileChangedDuringSave
      ? current.fileName
      : persisted.fileName,
    fileSize: fileChangedDuringSave
      ? current.fileSize
      : persisted.fileSize,
    fileType: fileChangedDuringSave
      ? current.fileType
      : persisted.fileType,
    downloadUrl: persisted.downloadUrl,
  };
}
