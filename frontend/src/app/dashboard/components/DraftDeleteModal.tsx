import type { AssessmentResponse } from "@/api/types";
import { Button, Modal } from "@/components";
import {
  getAssessmentName,
  getAssessmentVersion,
  type ModelDetails,
} from "../dashboardAssessments";

export default function DraftDeleteModal({
  draft,
  modelDetails,
  deletingDraftId,
  error,
  onClose,
  onConfirm,
}: {
  draft: AssessmentResponse | null;
  modelDetails: ModelDetails;
  deletingDraftId: number | null;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen={draft !== null}
      onClose={onClose}
      title="Delete assessment draft?"
      maxWidth="md"
      closeButtonDisabled={deletingDraftId !== null}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deletingDraftId !== null}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={deletingDraftId !== null}
          >
            {deletingDraftId !== null ? "Deleting..." : "Delete draft"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-6 text-slate-700">
        <p>
          This permanently deletes your saved progress for {" "}
          <span className="font-semibold">
            {draft ? getAssessmentName(draft, modelDetails) : "this model"}
            {draft && getAssessmentVersion(draft, modelDetails) != null
              ? ` (v${getAssessmentVersion(draft, modelDetails)})`
              : ""}
          </span>
          . This action cannot be undone.
        </p>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
