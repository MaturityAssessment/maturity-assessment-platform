"use client";

import type {
  AssessmentEvidenceInputItem,
  AssessmentEvidenceMetadataItem,
  Evidence,
  EvidenceRequirement,
  Practice,
} from "@/api/types";
import { TEXT_LIMITS } from "../../config/textLimits.ts";
import type { AssessmentPracticeStep } from "./AssessmentStep";

export type AssessmentEvidenceByField = Map<
  string,
  AssessmentEvidenceInputItem[]
>;

export const MAX_EVIDENCE_ITEMS_PER_FIELD = 5;
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
  if (item.type === "text") return item.description.trim().length > 0;
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
    const groups = new Map<string, AssessmentEvidenceInputItem[]>();
    for (const item of items) {
      const key = item.requirementCode || "";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    if ([...groups.values()].some(group => group.length > MAX_EVIDENCE_ITEMS_PER_FIELD && group.some(item => !item.evidenceId))) {
      return "Each evidence requirement or additional-evidence group can contain at most five items.";
    }

    for (const item of items) {
      const descriptionLimit = item.type === "text" ? TEXT_LIMITS.evidenceNote : TEXT_LIMITS.evidenceDescription;
      if (item.description.length > descriptionLimit) {
        return item.type === "text" ? "Evidence notes cannot exceed 10,000 characters."
          : "Evidence descriptions cannot exceed 500 characters.";
      }
      if (!isValidEvidenceItem(item)) {
        return item.type === "text" ? "Enter text for every evidence note." : item.type === "link"
          ? "Evidence links must use a complete https:// URL."
          : "Select a file for every file evidence item.";
      }
      if (item.collectedAt && !isValidCollectedAt(item.collectedAt)) {
        return "Evidence dates must be valid dates on or before today.";
      }
      if (!item.collectedAt && (!item.evidenceId || item.file)) {
        return "Enter the document date or reporting-period end for every new evidence record.";
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
        practiceId: item.practiceId,
        referencedQuestionIds: [...(item.referencedQuestionIds || [])],
        requirementCode: item.requirementCode || null,
        collectedAt: item.collectedAt || null,
        type: item.type === "file" ? "FILE" : item.type === "text" ? "TEXT" : "URL",
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
  const byPracticeId = new Map<
    number,
    { fieldName: string; practiceId: number }
  >();

  practiceSteps.forEach((step) => {
    if (step.practice.id != null) {
      byPracticeId.set(step.practice.id, {
        fieldName: getPracticeEvidenceField(step.practice.id),
        practiceId: step.practice.id,
      });
    }
  });

  const result: AssessmentEvidenceByField = new Map();
  (persistedEvidence || []).forEach((evidence) => {
    const target = byPracticeId.get(evidence.practiceId);
    if (!target) return;

    const items = result.get(target.fieldName) || [];
    items.push(evidenceToInputItem(evidence));
    result.set(target.fieldName, items);
  });
  return result;
}

export function evidenceToInputItem(evidence: Evidence): AssessmentEvidenceInputItem {
  return {
    id: evidence.clientKey || `persisted-evidence-${evidence.id}`,
    evidenceId: evidence.id,
    practiceId: evidence.practiceId,
    referencedQuestionIds: [...(evidence.referencedQuestionIds || [])],
    requirementCode: evidence.requirementCode,
    collectedAt: evidence.collectedAt,
    type: evidence.evidenceType === "FILE" ? "file" : evidence.evidenceType === "TEXT" ? "text" : "link",
    description: evidence.description || "",
    file: null,
    fileName: evidence.fileName,
    fileSize: evidence.fileSize,
    fileType: evidence.fileType,
    url: evidence.url || "",
    downloadUrl: evidence.downloadUrl,
  };
}

export function removeEvidenceFields(
  evidence: AssessmentEvidenceByField,
  fields: Set<string>
) {
  const next = new Map(evidence);
  fields.forEach((field) => next.delete(field));
  return next;
}

export function getPracticeEvidenceField(practiceId: number | undefined) {
  return `practice_${practiceId}_evidence`;
}

export function evidenceToday() {
  return new Date().toISOString().slice(0, 10);
}

export function isValidCollectedAt(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > evidenceToday()) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function acceptsEvidenceType(requirement: EvidenceRequirement, type: AssessmentEvidenceInputItem["type"]) {
  return requirement.format === "ANY" || (requirement.format === "FILE_OR_URL" && type !== "text")
    || requirement.format === (type === "link" ? "URL" : type.toUpperCase());
}

export function missingEvidenceRequirements(practice: Practice, items: AssessmentEvidenceInputItem[] = []) {
  if (practice.evidenceRequirements?.length) {
    return practice.evidenceRequirements.filter(requirement => requirement.required && !items.some(item =>
      item.requirementCode === requirement.code && isValidEvidenceItem(item) && acceptsEvidenceType(requirement, item.type)
      && (item.collectedAt ? isValidCollectedAt(item.collectedAt) : Boolean(item.evidenceId && !item.file)))).length;
  }
  return practice.requiresEvidence && !hasValidEvidenceItems(items) ? 1 : 0;
}
