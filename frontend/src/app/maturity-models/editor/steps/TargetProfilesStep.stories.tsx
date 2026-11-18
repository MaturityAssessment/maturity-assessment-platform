import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { TargetProfileConfiguration, TargetProfileComparison } from "@/api/types";
import { createEmptyDocument } from "../model/editorDocument";
import { profilingPath } from "@/lib/targetProfiles";
import TargetProfilesStep from "./TargetProfilesStep";
import AssessmentProfilingStep from "@/app/assessment/AssessmentProfilingStep";
import TargetProfileResults from "@/app/assessment/TargetProfileResults";

const config: TargetProfileConfiguration = {
  version: 1, rootQuestionId: "size",
  profiles: [
    { id: "small", name: "Small organization", description: "Baseline expectations for organizations with a small team.", requirements: [{ elementType: "dimension", dimensionCode: "D1", moduleCode: null, minimumScore: 0.6 }, { elementType: "module", dimensionCode: "D1", moduleCode: "M1", minimumScore: 0.7 }], expectedLevel: 3 },
    { id: "regulated", name: "Regulated enterprise", description: "Expectations for larger organizations in regulated sectors.", requirements: [{ elementType: "dimension", dimensionCode: "D1", moduleCode: null, minimumScore: 0.8 }], expectedLevel: null },
  ],
  questions: [
    { id: "size", text: "Which context best describes your organization?", options: [
      { id: "small", label: "Small organization", destination: { type: "profile", id: "small" } },
      { id: "large", label: "Large organization", destination: { type: "question", id: "regulation" } },
      { id: "other", label: "Another context", destination: { type: "none", id: null } },
    ] },
    { id: "regulation", text: "Does your organization operate in a regulated sector?", options: [
      { id: "yes", label: "Yes", destination: { type: "profile", id: "regulated" } },
      { id: "no", label: "No", destination: { type: "none", id: null } },
    ] },
  ],
};
function CreatorExample() {
  const [document, setDocument] = useState(() => {
    const value = createEmptyDocument(); value.name = "Organizational maturity"; value.description = "Assess organizational capability."; value.domainId = 1;
    value.dimensions[0].code = "D1"; value.dimensions[0].name = "Governance"; value.dimensions[0].modules[0].code = "M1"; value.dimensions[0].modules[0].name = "Management";
    value.targetProfiles = structuredClone(config); return value;
  });
  return <div className="bg-slate-50 p-4 sm:p-7"><TargetProfilesStep document={document} onChange={setDocument} /><pre hidden data-testid="profile-editor-draft">{JSON.stringify(document)}</pre></div>;
}
function RespondentExample() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const selected = profilingPath(config, answers).selection;
  return done ? <div className="p-8"><h1 className="text-xl font-semibold">Assessment overview</h1><p className="mt-4">Target profile: {selected.profileName || "No target profile applies"}</p><button className="mt-5 rounded border p-3" onClick={() => setDone(false)}>Edit profiling answers</button></div> : <AssessmentProfilingStep modelName="Organizational maturity" config={config} answers={answers} saving={false} error={null} onChange={setAnswers} onContinue={() => setDone(true)} onLeave={() => {}} />;
}
const comparison: TargetProfileComparison = { status: "NOT_MET", reason: null, profileId: "small", profileName: "Small organization", requirements: [
  { elementType: "dimension", dimensionCode: "D1", moduleCode: null, name: "Governance", target: 0.6, actual: 0.75, status: "MET", reason: null },
  { elementType: "module", dimensionCode: "D1", moduleCode: "M1", name: "Management", target: 0.7, actual: 0.55, status: "NOT_MET", reason: null },
  { elementType: "overall", dimensionCode: null, moduleCode: null, name: "Overall maturity level", target: 3, actual: null, status: "NOT_EVALUATED", reason: "SCORE_UNAVAILABLE" },
] };
const meta = { title: "Maturity models/Target profiles", component: CreatorExample, parameters: { layout: "fullscreen" } } satisfies Meta<typeof CreatorExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Creator: Story = {};
export const Respondent: Story = { render: () => <RespondentExample /> };
export const FinalComparison: Story = { render: () => <div className="mx-auto max-w-4xl p-4"><TargetProfileResults comparison={comparison} levels={[{ number: 3, name: "Managed" }]} /></div> };
