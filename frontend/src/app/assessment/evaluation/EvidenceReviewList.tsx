"use client";

import type { Evidence } from "@/api/types";
import { evidenceToInputItem } from "../assessmentEvidence";
import EvidenceItemDetails from "@/components/assessment/EvidenceItemDetails";
import type { EvidenceReferenceProps } from "@/components/assessment/EvidenceQuestionReferences";

interface EvidenceReviewListProps extends EvidenceReferenceProps {
  evidence: Evidence[];
  onDownload: (evidenceId: number, fileName?: string | null) => void;
}

export default function EvidenceReviewList({ evidence, onDownload, questions, inactiveQuestionIds }: EvidenceReviewListProps) {
  if (!evidence.length) return <p className="text-sm text-gray-500">No evidence attached.</p>;
  return <div className="space-y-2">{evidence.map(item => <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
    <EvidenceItemDetails item={evidenceToInputItem(item)} questions={questions} inactiveQuestionIds={inactiveQuestionIds}
      onDownload={() => onDownload(item.id, item.fileName)} />
  </div>)}</div>;
}
