"use client";

import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import type { AssessmentEvidenceInputItem } from "@/api/types";
import apiClient from "@/api/axios";
import { Button } from "@/components/ui/button";
import { evidenceItemLabel } from "@/app/assessment/evidenceReferences";
import { EvidenceQuestionReferenceChips, type EvidenceReferenceProps } from "./EvidenceQuestionReferences";

export async function downloadEvidenceItem(item: AssessmentEvidenceInputItem) {
  let blob: Blob;
  if (item.file) blob = item.file;
  else {
    if (!item.evidenceId) return;
    const campaignId = new URLSearchParams(window.location.search).get("campaignId");
    const response = await apiClient.get(campaignId
      ? `/api/v1/campaign-response/${campaignId}/evidence/${item.evidenceId}/download`
      : `/api/v1/evidence/${item.evidenceId}/download`, { responseType: "blob" });
    blob = response.data;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = item.fileName || `evidence-${item.evidenceId}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function EvidenceItemDetails({ item, questions, inactiveQuestionIds, onDownload, evidenceRequirements = [] }: EvidenceReferenceProps & {
  item: AssessmentEvidenceInputItem; onDownload?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return <div className="space-y-3">
    <p className="break-words text-sm font-medium text-slate-900">{evidenceItemLabel(item)}</p>
    {item.description && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.description}</p>}
    <p className="text-xs text-slate-500">Evidence date: {item.evidenceDate || "Unknown"}</p>
    {item.requirementCode && <p className="text-xs text-indigo-700">Requirement: {evidenceRequirements.find(requirement => requirement.code === item.requirementCode)?.name || item.requirementCode}</p>}
    <EvidenceQuestionReferenceChips questions={questions} inactiveQuestionIds={inactiveQuestionIds} referencedQuestionIds={item.referencedQuestionIds} />
    {item.type === "file" && <Button type="button" variant="outline" size="sm" onClick={async () => {
      setError(null);
      try { if (onDownload) onDownload(); else await downloadEvidenceItem(item); }
      catch { setError("Could not download this evidence file."); }
    }}><Download aria-hidden="true" className="h-4 w-4" /> Download</Button>}
    {item.type === "link" && item.url.startsWith("https://") && <Button type="button" variant="outline" size="sm" asChild>
      <a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" className="h-4 w-4" /> Open link</a>
    </Button>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
