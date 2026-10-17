import { useState } from "react";
import { revertEditorChange } from "../model/editorRevert";
import type { Meta, StoryObj } from "@storybook/react";
import ChangesPreview from "./ChangesPreview";
import { compareDocuments } from "../model/editorChanges";
import { createEmptyDocument, emptyPractice } from "../model/editorDocument";

const baseline = createEmptyDocument();
baseline.name = "Governance model";
baseline.dimensions[0].name = "Governance";
baseline.dimensions[0].modules[0].name = "Policies";
baseline.dimensions[0].modules[0].practices[0].name = "Ownership";
baseline.dimensions[0].modules[0].practices[0].questions[0].text = "Is ownership defined?";
const document = structuredClone(baseline);
document.dimensions[0].modules[0].practices[0].questions[0].text = "Is ownership documented and reviewed regularly across teams?";
const meta = { title: "Maturity models/Changes preview", component: ChangesPreview, args: { document, changes: compareDocuments(baseline, document) } } satisfies Meta<typeof ChangesPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SingleQuestion: Story = {};
export const Unchanged: Story = { args: { document: baseline, changes: compareDocuments(baseline, baseline) } };
export const NewModel: Story = { args: { changes: compareDocuments(null, document) } };
const mixed = structuredClone(document);
const added = emptyPractice(2, 1); added.name = "Incident response";
mixed.dimensions[0].modules[0].practices.push(added);
mixed.description = "A long description. ".repeat(80);
mixed.changelogMarkdown = "Updated ownership and added incident response.";
export const MixedChanges: Story = { args: { document: mixed, changes: compareDocuments(baseline, mixed, "import") } };
export const Narrow: Story = { ...MixedChanges, decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>] };
const removed = structuredClone(baseline); removed.dimensions = [];
export const RemovedBranch: Story = { args: { document: removed, changes: compareDocuments(baseline, removed) } };

const parentChanges = structuredClone(document);
parentChanges.dimensions[0].name = "Governance and oversight";
parentChanges.dimensions[0].modules[0].practices[0].requiresEvidence = true;
export const EditedParents: Story = { args: { document: parentChanges, changes: compareDocuments(baseline, parentChanges) } };
export const SingleQuestionNarrow: Story = { ...SingleQuestion, decorators: [(Story) => <div style={{ maxWidth: 360 }}><Story /></div>] };
const multiple = structuredClone(mixed);
multiple.dimensions[0].modules[0].name = "Policies / procedures";
multiple.dimensions[0].modules[0].practices[0].description = "Accountability is reviewed annually.";
export const SeveralChangesInOneBranch: Story = { args: { document: multiple, changes: compareDocuments(baseline, multiple) } };

const filled = structuredClone(baseline);
filled.dimensions[0].modules[0].practices[0].questions[0].help = "Include the owner’s role and the most recent review date.";
export const PreviouslyEmptyField: Story = { args: { document: filled, changes: compareDocuments(baseline, filled) } };
export const ClearedField: Story = { args: { document: baseline, changes: compareDocuments(filled, baseline) } };


function RevertExample() {
  const [current, setCurrent] = useState(() => structuredClone(parentChanges));
  const [previous, setPrevious] = useState<typeof current | null>(null);
  return <ChangesPreview document={current} changes={compareDocuments(baseline, current)}
    onRevert={id => {
      setPrevious(current);
      setCurrent(revertEditorChange(current, baseline, id));
    }}
    onUndoRevert={previous ? () => { setCurrent(previous); setPrevious(null); } : undefined} />;
}
export const RevertAndUndo: Story = { render: () => <RevertExample /> };
