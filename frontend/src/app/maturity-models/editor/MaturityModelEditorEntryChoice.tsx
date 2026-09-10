"use client";

import { useRef, type ChangeEvent } from "react";
import { TopNavbar, Notice, type NoticeType } from "@/components";
import {
  DocumentArrowUpIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

type MaturityModelEditorEntryChoiceProps = {
  notice: {
    type: NoticeType;
    message: string;
  } | null;
  importing: boolean;
  onSelectManual: () => void;
  onCancel: () => void;
  onImportFile: (file: File) => void;
  onDismissNotice: () => void;
};

export default function MaturityModelEditorEntryChoice({
  notice,
  importing,
  onSelectManual,
  onCancel,
  onImportFile,
  onDismissNotice,
}: MaturityModelEditorEntryChoiceProps) {
  const importInput = useRef<HTMLInputElement>(null);

  const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImportFile(file);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar
        title="Create maturity model"
        subtitle="Choose how you want to start"
      />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={onSelectManual}
            className="rounded-xl border-2 border-gray-200 bg-white p-8 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <PlusIcon className="h-9 w-9 text-blue-600" />
            <h2 className="mt-5 text-xl font-semibold text-gray-950">
              Build manually
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Work through overview, maturity scale, structure, and review.
            </p>
          </button>
          <button
            type="button"
            onClick={() => importInput.current?.click()}
            disabled={importing}
            className="rounded-xl border-2 border-gray-200 bg-white p-8 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md disabled:opacity-60"
          >
            <DocumentArrowUpIcon className="h-9 w-9 text-indigo-600" />
            <h2 className="mt-5 text-xl font-semibold text-gray-950">
              Start from Excel
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Parse a workbook into the editor, then inspect and correct it
              before saving.
            </p>
            <span className="mt-4 block text-sm font-medium text-blue-600">
              {importing ? "Loading workbook..." : "Choose workbook"}
            </span>
          </button>
        </div>
        {notice && (
          <Notice
            type={notice.type}
            message={notice.message}
            onDismiss={onDismissNotice}
          />
        )}
        <a
          href="/filipevm/templates/maturity-model-template.xlsx"
          download
          className="mt-8 inline-flex text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Download the Excel template
        </a>
        <button
          type="button"
          onClick={onCancel}
          className="ml-6 mt-8 text-sm font-medium text-gray-600 hover:text-gray-950"
        >
          Cancel
        </button>
        <input
          ref={importInput}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleImportChange}
        />
      </main>
    </div>
  );
}
