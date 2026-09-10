"use client";

import { ExternalLink, FileDown, Paperclip } from "lucide-react";
import type { Evidence } from "@/api/types";

interface EvidenceReviewListProps {
  evidence: Evidence[];
  onDownload: (evidenceId: number, fileName?: string | null) => void;
}

export default function EvidenceReviewList({
  evidence,
  onDownload,
}: EvidenceReviewListProps) {
  if (evidence.length === 0) {
    return <p className="text-sm text-gray-500">No evidence attached.</p>;
  }

  return (
    <div className="space-y-2">
      {evidence.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2"
        >
          <div className="flex min-w-0 items-start gap-2">
            <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {item.evidenceType === "URL"
                  ? item.url || "External link"
                  : item.fileName || "Evidence file"}
              </p>
              {item.description && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {item.evidenceType === "FILE" ? (
            <button
              type="button"
              onClick={() => onDownload(item.id, item.fileName)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileDown className="h-4 w-4" />
              Download
            </button>
          ) : (
            item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            )
          )}
        </div>
      ))}
    </div>
  );
}
