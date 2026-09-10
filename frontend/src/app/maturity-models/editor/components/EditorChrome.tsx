import { useRef, type ChangeEvent, type ReactNode } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { TopNavbar, Notice } from "@/components";
import {
  EDITOR_STEPS,
  type EditorNotice,
  type EditorStep,
} from "../model/editorTypes";

type EditorChromeProps = {
  editing: boolean;
  step: EditorStep;
  dirty: boolean;
  saving: boolean;
  importing: boolean;
  notice: EditorNotice | null;
  issueCountByStep: Record<EditorStep, number>;
  children: ReactNode;
  onStepChange: (step: EditorStep) => void;
  onDismissNotice: () => void;
  onImportFile: (file: File) => Promise<boolean>;
  onCancel: () => void;
  onSave: () => Promise<void>;
};

export default function EditorChrome({
  editing,
  step,
  dirty,
  saving,
  importing,
  notice,
  issueCountByStep,
  children,
  onStepChange,
  onDismissNotice,
  onImportFile,
  onCancel,
  onSave,
}: EditorChromeProps) {
  const importInput = useRef<HTMLInputElement>(null);

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (await onImportFile(file))) {
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopNavbar
        title={editing ? "Create new model version" : "Create maturity model"}
        subtitle={
          editing
            ? "The saved result will be a new inactive version."
            : "The saved model will remain inactive until you publish it."
        }
        showUserMenu={false}
        rightActions={
          <div className="flex items-center gap-3">
            <input
              ref={importInput}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => void handleImportChange(event)}
            />
            <button
              type="button"
              onClick={() => importInput.current?.click()}
              disabled={importing}
              className="hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 sm:inline-flex"
            >
              {importing ? "Importing..." : "Import Excel"}
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {notice && (
          <Notice
            type={notice.type}
            message={notice.message}
            onDismiss={onDismissNotice}
          />
        )}

        <nav
          aria-label="Model editor steps"
          className="mb-6 grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-4"
        >
          {EDITOR_STEPS.map((item, index) => {
            const active = step === item.id;
            const count = issueCountByStep[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onStepChange(item.id)}
                className={`flex items-center gap-3 border-b px-4 py-4 text-left transition last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${
                  active
                    ? "bg-blue-50 text-blue-950"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    active
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {item.label}
                    {count > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="hidden text-xs text-gray-500 lg:block">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
          >
            Exit
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">
              {dirty ? "Draft saved in this browser" : "No unsaved changes"}
            </span>
            {step !== "review" ? (
              <button
                type="button"
                onClick={() => {
                  const index = EDITOR_STEPS.findIndex(
                    (item) => item.id === step
                  );
                  onStepChange(
                    EDITOR_STEPS[
                      Math.min(index + 1, EDITOR_STEPS.length - 1)
                    ].id
                  );
                }}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={saving}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Create inactive version"
                    : "Create inactive model"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
