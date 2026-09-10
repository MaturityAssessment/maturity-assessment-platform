"use client";

import type {
  AssessmentEvidenceInputItem,
  AssessmentEvidenceMetadataItem,
  Evidence,
} from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";

export type AssessmentEvidenceByField = Map<
  string,
  AssessmentEvidenceInputItem[]
>;

export const MAX_EVIDENCE_ITEMS_PER_QUESTION = 5;
export const MAX_EVIDENCE_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_EVIDENCE_REQUEST_FILE_SIZE = 250 * 1024 * 1024;

export const ACCEPTED_EVIDENCE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

export function createEvidenceClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isValidEvidenceItem(item: AssessmentEvidenceInputItem) {
  if (item.type === "link") {
    try {
      const parsed = new URL(item.url.trim());
      return parsed.protocol === "https:" && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }
  return Boolean(item.file || (item.evidenceId && item.fileName));
}

export function hasValidEvidenceItems(
  items: AssessmentEvidenceInputItem[] | undefined
) {
  return Boolean(items?.some(isValidEvidenceItem));
}

export function validateEvidenceForSave(evidence: AssessmentEvidenceByField) {
  let uploadedBytes = 0;

  for (const items of evidence.values()) {
    if (items.length > MAX_EVIDENCE_ITEMS_PER_QUESTION) {
      return "A question can contain at most five evidence items.";
    }

    for (const item of items) {
      if (!isValidEvidenceItem(item)) {
        return item.type === "link"
          ? "Evidence links must use a complete https:// URL."
          : "Select a file for every file evidence item.";
      }
      if (item.file) {
        if (!ACCEPTED_EVIDENCE_TYPES.includes(item.file.type)) {
          return `File type not allowed: ${item.file.name}`;
        }
        if (item.file.size <= 0 || item.file.size > MAX_EVIDENCE_FILE_SIZE) {
          return `Evidence files cannot exceed 50MB: ${item.file.name}`;
        }
        uploadedBytes += item.file.size;
      }
    }
  }

  if (uploadedBytes > MAX_EVIDENCE_REQUEST_FILE_SIZE) {
    return "New evidence uploads cannot exceed 250MB in one save.";
  }
  return null;
}

export function buildEvidencePayload(evidence: AssessmentEvidenceByField) {
  const metadata: AssessmentEvidenceMetadataItem[] = [];
  const uploads: Array<{ itemKey: string; file: File }> = [];

  evidence.forEach((items) => {
    items.forEach((item) => {
      const itemKey = item.file ? item.id : undefined;
      metadata.push({
        evidenceId: item.evidenceId,
        itemKey,
        clientKey: item.id,
        questionId: item.questionId,
        type: item.type === "file" ? "FILE" : "URL",
        description: item.description.trim(),
        ...(item.type === "link" ? { url: item.url.trim() } : {}),
      });
      if (item.file) {
        uploads.push({ itemKey: item.id, file: item.file });
      }
    });
  });

  return { metadata, uploads };
}

export function hydrateEvidenceByField(
  persistedEvidence: Evidence[] | null | undefined,
  practiceSteps: AssessmentPracticeStep[]
): AssessmentEvidenceByField {
  const byQuestionId = new Map<
    number,
    { fieldName: string; questionId: number }
  >();

  practiceSteps.forEach((step) => {
    step.practice.questions.forEach((question) => {
      if (question.id) {
        byQuestionId.set(question.id, {
          fieldName: `${step.dimension.id}_${step.module.code}_${String(
            step.practice.id || step.practice.name
          )}_${question.id}`,
          questionId: question.id,
        });
      }
    });
  });

  const result: AssessmentEvidenceByField = new Map();
  (persistedEvidence || []).forEach((evidence) => {
    const target = byQuestionId.get(evidence.questionId);
    if (!target) return;

    const items = result.get(target.fieldName) || [];
    items.push({
      id: evidence.clientKey || `persisted-evidence-${evidence.id}`,
      evidenceId: evidence.id,
      questionId: evidence.questionId,
      type: evidence.evidenceType === "FILE" ? "file" : "link",
      description: evidence.description || "",
      file: null,
      fileName: evidence.fileName,
      fileSize: evidence.fileSize,
      fileType: evidence.fileType,
      url: evidence.url || "",
      downloadUrl: evidence.downloadUrl,
    });
    result.set(target.fieldName, items);
  });
  return result;
}

export function removeEvidenceFields(
  evidence: AssessmentEvidenceByField,
  fields: Set<string>
) {
  const next = new Map(evidence);
  fields.forEach((field) => next.delete(field));
  return next;
}
