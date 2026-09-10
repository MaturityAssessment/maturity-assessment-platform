import type { MaturityModelEditorDocument } from "@/api/types";
import type {
  EditorIssue,
  Selection,
  StructureEditorCommands,
} from "../../model/editorTypes";
import ModelOutline from "./ModelOutline";
import SelectedItemEditor from "./SelectedItemEditor";

export default function StructureStep({
  document,
  selection,
  issues,
  onSelect,
  commands,
}: {
  document: MaturityModelEditorDocument;
  selection: Selection | null;
  issues: EditorIssue[];
  onSelect: (selection: Selection) => void;
  commands: StructureEditorCommands;
}) {
  const selected =
    selection ??
    (document.dimensions[0]
      ? { type: "dimension" as const, key: document.dimensions[0].clientKey }
      : null);

  return (
    <div className="grid min-h-[38rem] gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <ModelOutline
        document={document}
        selection={selected}
        issues={issues}
        onSelect={onSelect}
        onAddDimension={commands.addDimension}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        {!selected ? (
          <div className="py-20 text-center text-gray-500">
            Add a dimension to begin.
          </div>
        ) : (
          <SelectedItemEditor
            document={document}
            selection={selected}
            onSelect={onSelect}
            commands={commands}
          />
        )}
      </section>
    </div>
  );
}
