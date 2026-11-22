import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { MaturityModel, TargetProfileConfiguration, TargetProfileComparison } from "@/api/types";
import { createEmptyDocument } from "../model/editorDocument";
import { profilingPath } from "@/lib/targetProfiles";
import TargetProfilesStep from "./TargetProfilesStep";
import AssessmentProfilingDialog from "@/app/assessment/AssessmentProfilingDialog";
import AssessmentDashboard from "@/app/assessment/AssessmentDashboard";
import { buildPracticeSteps } from "@/app/assessment/assessmentRoutes";
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
  const [open, setOpen] = useState(true);
  const selected = profilingPath(config, answers).selection;
  const model: MaturityModel = { id: 7, name: "Organizational maturity", description: "Assess organizational capability.", isActive: true, targetProfiles: config,
    dimensions: ["Governance", "People & culture", "Operations"].map((name, index) => ({ id: `D${index + 1}`, name, modules: [{ code: "M1", name: "Management", practices: [{ id: index + 1, code: "P1", name: "Organizational capability", questions: [{ id: index + 1, text: "Is a documented process in place?", type: "boolean", required: true, weight: 1, help: "" }] }] }] })) };
  const noOp = () => {};
  return <>
    <AssessmentDashboard model={model} practiceSteps={buildPracticeSteps(model)} formData={{}} evidenceFiles={new Map()} activeTab="overview"
      assessment={{ id: 41, status: "DRAFT", profiling: selected, createdAt: "2026-11-22", overallAverage: 0, overallMaturityLevel: "", isCompleted: false }}
      onEditProfiling={() => setOpen(true)} isLeaving={false} isPreparingReview={false} canReview={false} error={null} saveStatus="saved" saveError={null}
      changesRequested={false} completed={false} respondentUpdatedResponseKeys={new Set()} tourInvitation={null}
      onStartTour={noOp} onDismissTourInvitation={noOp} onTabChange={noOp} onDimensionSelect={noOp} onLeave={noOp} onReview={noOp}
      onRetrySave={noOp} onInputChange={noOp} onClearAnswer={noOp} onEvidenceItemsChange={noOp} />
    <AssessmentProfilingDialog open={open} config={config} answers={answers} saving={false} error={null} onChange={setAnswers} onSave={() => setOpen(false)} onDismiss={() => setOpen(false)} />
  </>;
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
