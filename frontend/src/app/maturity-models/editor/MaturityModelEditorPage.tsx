"use client";

import { TopNavbar, PageLoading } from "@/components";
import EditorChrome from "./components/EditorChrome";
import { useMaturityModelEditor } from "./hooks/useMaturityModelEditor";
import OverviewStep from "./steps/OverviewStep";
import ReviewStep from "./steps/ReviewStep";
import ScaleStep from "./steps/ScaleStep";
import StructureStep from "./steps/structure/StructureStep";
import MaturityModelEditorEntryChoice from "./MaturityModelEditorEntryChoice";

type Props = {
  sourceModelId?: string;
  returnHref?: string;
};

export default function MaturityModelEditorPage({
  sourceModelId,
  returnHref,
}: Props) {
  const editor = useMaturityModelEditor(sourceModelId, returnHref);
  const {
    state,
    editing,
    domains,
    issues,
    issueCountByStep,
    structureCommands,
  } = editor;

  if (state.loading) {
    return <PageLoading message="Loading model editor..." />;
  }
  if (state.loadError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar title="Model editor" />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-gray-950">
            Could not open the editor
          </h1>
          <p className="mt-2 text-gray-600">{state.loadError}</p>
          <button className="mt-6 text-blue-600" onClick={editor.cancel}>
            Return to maturity models
          </button>
        </div>
      </div>
    );
  }

  if (!editing && !state.entryChoice) {
    return (
      <MaturityModelEditorEntryChoice
        notice={state.notice}
        importing={state.importing}
        onSelectManual={editor.selectManual}
        onCancel={editor.cancel}
        onImportFile={editor.importWorkbook}
        onDismissNotice={editor.dismissNotice}
      />
    );
  }

  if (!state.document) {
    return <PageLoading message="Preparing editor..." />;
  }

  return (
    <EditorChrome
      editing={editing}
      step={state.step}
      dirty={state.dirty}
      saving={state.saving}
      importing={state.importing}
      notice={state.notice}
      issueCountByStep={issueCountByStep}
      onStepChange={editor.setStep}
      onDismissNotice={editor.dismissNotice}
      onImportFile={editor.importWorkbook}
      onCancel={editor.cancel}
      onSave={editor.save}
    >
      {state.step === "overview" && (
        <OverviewStep
          document={state.document}
          domains={domains}
          onChange={editor.replaceDocument}
        />
      )}
      {state.step === "scale" && (
        <ScaleStep
          document={state.document}
          onChange={editor.replaceDocument}
        />
      )}
      {state.step === "structure" && (
        <StructureStep
          document={state.document}
          selection={state.selection}
          issues={issues}
          onSelect={editor.select}
          commands={structureCommands}
        />
      )}
      {state.step === "review" && (
        <ReviewStep
          document={state.document}
          issues={issues}
          editing={editing}
          onIssueClick={editor.selectIssue}
        />
      )}
    </EditorChrome>
  );
}
