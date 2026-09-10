"use client";

import { useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  FilePlus2,
  Link2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AssessmentEvidenceInputItem } from "@/api/types";
import apiClient from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEXT_LIMITS } from "@/config/textLimits";
import {
  ACCEPTED_EVIDENCE_TYPES,
  createEvidenceClientId,
  isValidEvidenceItem,
  MAX_EVIDENCE_FILE_SIZE,
  MAX_EVIDENCE_ITEMS_PER_QUESTION,
} from "@/app/assessment/assessmentEvidence";

interface EvidenceUploadProps {
  questionId: number;
  items: AssessmentEvidenceInputItem[];
  onItemsChange: (items: AssessmentEvidenceInputItem[]) => void;
  required?: boolean;
  allowedType?: "file" | "link" | "both";
  readOnly?: boolean;
}

export default function EvidenceUpload({
  questionId,
  items,
  onItemsChange,
  required = false,
  allowedType = "both",
  readOnly = false,
}: EvidenceUploadProps) {
  const addFilesRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const remainingSlots = MAX_EVIDENCE_ITEMS_PER_QUESTION - items.length;
  const hasRequiredEvidence = items.some(
    (item) =>
      (allowedType === "both" || item.type === allowedType) &&
      isValidEvidenceItem(item)
  );

  const validateFile = (file: File) => {
    if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
      return `File type not allowed: ${file.name}`;
    }
    if (file.size <= 0 || file.size > MAX_EVIDENCE_FILE_SIZE) {
      return `File must be larger than 0 bytes and no more than 50MB: ${file.name}`;
    }
    return null;
  };

  const handleAddFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (selected.length === 0) return;
    if (selected.length > remainingSlots) {
      setError(`You can add ${Math.max(remainingSlots, 0)} more evidence item(s).`);
      return;
    }
    for (const file of selected) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    onItemsChange([
      ...items,
      ...selected.map((file) => ({
        id: createEvidenceClientId(),
        questionId,
        type: "file" as const,
        description: "",
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: "",
      })),
    ]);
  };

  const addLink = () => {
    if (remainingSlots <= 0) return;
    setError(null);
    onItemsChange([
      ...items,
      {
        id: createEvidenceClientId(),
        questionId,
        type: "link",
        description: "",
        file: null,
        url: "",
      },
    ]);
  };

  const updateItem = (
    itemId: string,
    update: Partial<AssessmentEvidenceInputItem>
  ) => {
    setError(null);
    onItemsChange(
      items.map((item) => (item.id === itemId ? { ...item, ...update } : item))
    );
  };

  const replaceFile = (
    item: AssessmentEvidenceInputItem,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    updateItem(item.id, {
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  };

  const downloadPersistedFile = async (item: AssessmentEvidenceInputItem) => {
    if (!item.evidenceId) return;
    try {
      const campaignToken =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("campaignToken");
      const response = await apiClient.get(
        campaignToken
          ? `/api/v1/campaign-response/evidence/${item.evidenceId}/download`
          : `/api/v1/evidence/${item.evidenceId}/download`,
        {
          responseType: "blob",
          ...(campaignToken
            ? { headers: { "X-Campaign-Token": campaignToken } }
            : {}),
        }
      );
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = item.fileName || `evidence-${item.evidenceId}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      console.error("Error downloading evidence:", downloadError);
      setError("Could not download this evidence file.");
    }
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-5 py-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            {allowedType === "link" ? (
              <Link2 className="h-5 w-5" />
            ) : (
              <FilePlus2 className="h-5 w-5" />
            )}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {allowedType === "file"
              ? "Upload supporting files"
              : allowedType === "link"
                ? "Add a secure evidence link"
                : "Attach evidence"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
            {allowedType === "file"
              ? "PDF, Office, image, or text files up to 50MB each."
              : allowedType === "link"
                ? "Use a complete HTTPS link your reviewer can access."
                : "Upload a file or add a secure HTTPS link."}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                    {item.type === "file" ? "File" : "Secure link"} {index + 1}
                  </p>
                  {item.type === "file" && (
                    <p className="mt-1 truncate text-sm font-medium text-gray-900">
                      {item.fileName || item.file?.name || "Selected file"}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onItemsChange(items.filter((candidate) => candidate.id !== item.id))
                    }
                    aria-label="Remove evidence item"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>

              {item.type === "file" ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.evidenceId && !item.file && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPersistedFile(item)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    )}
                    {!readOnly && (
                      <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        {item.evidenceId ? "Replace file" : "Choose another file"}
                        <input
                          type="file"
                          className="sr-only"
                          accept={ACCEPTED_EVIDENCE_TYPES.join(",")}
                          onChange={(event) => replaceFile(item, event)}
                        />
                      </label>
                    )}
                    {item.fileSize != null && (
                      <span className="text-xs text-gray-500">
                        {formatFileSize(item.fileSize)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  {readOnly ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-sm font-medium text-indigo-700 underline"
                    >
                      {item.url}
                    </a>
                  ) : (
                    <Input
                      type="url"
                      value={item.url}
                      maxLength={TEXT_LIMITS.url}
                      onChange={(event) =>
                        updateItem(item.id, { url: event.target.value })
                      }
                      placeholder="https://example.com/evidence"
                    />
                  )}
                  {item.url.trim().startsWith("https://") && (
                    <Button type="button" variant="outline" size="icon" asChild>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {readOnly ? (
                item.description && (
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    {item.description}
                  </p>
                )
              ) : (
                <Input
                  className="mt-3"
                  value={item.description}
                  onChange={(event) =>
                    updateItem(item.id, { description: event.target.value })
                  }
                  placeholder="Optional description"
                  maxLength={TEXT_LIMITS.evidenceDescription}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
        <input
          ref={addFilesRef}
          type="file"
          multiple
          className="sr-only"
          accept={ACCEPTED_EVIDENCE_TYPES.join(",")}
          onChange={handleAddFiles}
        />
        {allowedType !== "link" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addFilesRef.current?.click()}
            disabled={remainingSlots <= 0}
          >
            <FilePlus2 className="h-4 w-4" />
            {items.length === 0 ? "Choose files" : "Add file"}
          </Button>
        )}
        {allowedType !== "file" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            disabled={remainingSlots <= 0}
          >
            <Link2 className="h-4 w-4" />
            Add secure link
          </Button>
        )}
        <span className="text-xs text-gray-500">
          {items.length}/{MAX_EVIDENCE_ITEMS_PER_QUESTION} items
        </span>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!readOnly && required && !hasRequiredEvidence && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
          <ShieldCheck className="h-4 w-4" />
          {allowedType === "file"
            ? "At least one file is required."
            : allowedType === "link"
              ? "At least one secure link is required."
              : "Add at least one file or secure link."}
        </div>
      )}

      {!readOnly && (
        <p className="text-xs text-gray-500">
          Up to five items.
          {allowedType !== "link" && " Files may be at most 50MB each."}
          {allowedType !== "file" && " Links must use HTTPS."}
        </p>
      )}
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
