import type { MaturityModelEditorDocument } from "@/api/types";
import { findSelectedItem } from "../../model/editorMutations";
import type {
  Selection,
  StructureEditorCommands,
} from "../../model/editorTypes";
import DimensionEditor from "./DimensionEditor";
import ModuleEditor from "./ModuleEditor";
import PracticeEditor from "./PracticeEditor";

export default function SelectedItemEditor({
  document,
  selection,
  onSelect,
  commands,
}: {
  document: MaturityModelEditorDocument;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  commands: StructureEditorCommands;
}) {
  const selected = findSelectedItem(document, selection);

  if (selected?.type === "dimension") {
    return (
      <DimensionEditor
        document={document}
        dimension={selected.dimension}
        onSelect={onSelect}
        commands={commands}
      />
    );
  }
  if (selected?.type === "module") {
    return (
      <ModuleEditor
        dimension={selected.dimension}
        module={selected.module}
        onSelect={onSelect}
        commands={commands}
      />
    );
  }
  if (selected?.type === "practice") {
    return (
      <PracticeEditor
        document={document}
        module={selected.module}
        practice={selected.practice}
        commands={commands}
      />
    );
  }
  return <p className="text-gray-500">Select an item from the outline.</p>;
}
