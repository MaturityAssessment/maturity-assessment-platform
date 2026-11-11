import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { AssessmentEvidenceInputItem, Practice } from "@/api/types";
import PracticeEvidence from "./PracticeEvidence";

const practice: Practice = { id: 42, name: "Incident management", questions: [
  { id: 100, code: "Q1", text: "Are incidents reviewed monthly?", type: "boolean", weight: 1, help: "" },
], evidenceRequirements: [
  { code: "report", name: "Monthly incident report", instructions: "Provide the latest completed monthly report. Use the last day of its reporting period as the evidence date.", required: true, format: "FILE_OR_URL" },
  { code: "policy", name: "Incident response policy", instructions: "Use the policy approval date.", required: true, format: "FILE_OR_URL" },
  { code: "exercise", name: "Exercise report", instructions: "A recent incident response exercise.", required: false, format: "FILE" },
] };
const sample: AssessmentEvidenceInputItem[] = [{ id: "policy", evidenceId: 1, practiceId: 42,
  requirementCode: "policy", evidenceDate: "2020-08-15", type: "link", description: "Approved incident response policy",
  file: null, url: "https://example.com/policy", referencedQuestionIds: [100] }];

function Interactive(args: React.ComponentProps<typeof PracticeEvidence>) {
  const [items, setItems] = useState(args.items);
  return <div className="mx-auto max-w-3xl rounded-xl bg-slate-50 p-5"><PracticeEvidence {...args} items={items} onItemsChange={setItems} /></div>;
}
const meta = { title: "Assessment/Practice evidence", component: PracticeEvidence, render: Interactive,
  args: { practice, questions: practice.questions, items: sample, required: true, onItemsChange: () => undefined },
} satisfies Meta<typeof PracticeEvidence>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NamedRequirements: Story = {};
export const ReadOnly: Story = { args: { readOnly: true } };
export const UnknownDate: Story = { args: { items: [{ ...sample[0], evidenceDate: null }] } };
