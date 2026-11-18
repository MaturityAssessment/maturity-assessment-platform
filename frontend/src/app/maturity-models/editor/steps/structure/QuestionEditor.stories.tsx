import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { emptyPractice, emptyQuestion } from "../../model/editorDocument";
import QuestionEditor from "./QuestionEditor";
import QuestionDependenciesPreview from "./QuestionDependenciesPreview";
import PracticeEvidenceEditor from "./PracticeEvidenceEditor";
import type { ModelEditorPractice, ModelEditorQuestion } from "@/api/types";

function DependencyExample() {
  const [practice, setPractice] = useState(() => {
    const initial = emptyPractice(1, 1);
    const boolean = { ...emptyQuestion(1), text: "Is the process documented?" };
    const choice = { ...emptyQuestion(2), type: "multiple_choice" as const,
      text: "How consistently is this process followed across teams, departments, and external partners during each stage of its lifecycle?",
      choices: [
        { id: "none", label: "Not implemented", score: 0 },
        { id: "partial", label: "Partially implemented across some teams", score: 0.5 },
        { id: "full", label: "Fully implemented across all teams, departments, and external partners with regular reviews and documented follow-up actions", score: 0.5 },
      ] };
    const scale = { ...emptyQuestion(3), type: "likert" as const, text: "How often is the process reviewed?",
      scaleMinLabel: "Never", scaleMaxLabel: "Always" };
    const child = { ...emptyQuestion(4), text: "Describe the follow-up process.", dependsOnQuestionCode: choice.code,
      dependencyCondition: { type: "multiple_choice" as const, optionIds: ["partial"] } };
    return { ...initial, questions: [boolean, choice, scale, child] };
  });
  const [open, setOpen] = useState(true);
  return <>
    <button className="rounded border px-4 py-2" onClick={() => setOpen(true)}>Open question editor</button>
    {open && <QuestionEditor question={practice.questions[3]} questionIndex={3} practice={practice} maxLevel={5}
      onClose={() => setOpen(false)} onDelete={() => setOpen(false)}
      onChange={(question) => setPractice((current) => ({ ...current, questions: current.questions.map((item) => item.clientKey === question.clientKey ? question : item) }))} />}
  </>;
}

const meta = { title: "Maturity models/Question dependencies", component: DependencyExample } satisfies Meta<typeof DependencyExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};

function NotApplicableExample() {
  const [question, setQuestion] = useState<ReturnType<typeof emptyQuestion>>(() => ({
    ...emptyQuestion(1), text: "Is this process documented?", allowNotApplicable: true, notApplicableScore: 0.5,
  }));
  const [open, setOpen] = useState(true);
  return <>
    <button className="rounded border px-4 py-2" onClick={() => setOpen(true)}>Open question editor</button>
    {open && <QuestionEditor question={question} questionIndex={0}
      practice={{ ...emptyPractice(1, 1), questions: [question] }} maxLevel={5}
      onChange={setQuestion} onClose={() => setOpen(false)} onDelete={() => setOpen(false)} />}
  </>;
}

export const NotApplicable: Story = { render: () => <NotApplicableExample /> };

function BranchingWorkspace() {
  const [practice, setPractice] = useState<ModelEditorPractice>(() => {
    const questions: ModelEditorQuestion[] = [
      { ...emptyQuestion(1), text: "Is this process documented?", allowNotApplicable: true, notApplicableScore: 0.5 },
      { ...emptyQuestion(2), type: "multiple_selection", text: "Which controls are in place?", choices: [
        { id: "policy", label: "Published policy", score: 0.5, rawValue: 1 },
        { id: "review", label: "Regular reviews", score: 1, rawValue: 1 },
      ] },
      { ...emptyQuestion(3), type: "likert", text: "How often do teams review the process?" },
      { ...emptyQuestion(4), type: "open_answer", text: "Describe the follow-up process.", hiddenScore: 0.5,
        branchingRule: { version: 1, when: { kind: "and", conditions: [
          { kind: "parent", code: emptyQuestion(1).code, predicate: { kind: "in", values: [true] } },
          { kind: "not", condition: { kind: "parent", code: emptyQuestion(2).code, predicate: { kind: "in", values: ["policy", "review"] } } },
        ] } } },
      { ...emptyQuestion(5), text: "Was the follow-up effective?", branchingRule: { version: 1, when: { kind: "parent", code: emptyQuestion(4).code, predicate: { kind: "answered" } } } },
      { ...emptyQuestion(6), type: "numeric", text: "How many reviews were completed?", rangeMin: 0, rangeMax: 100 },
    ];
    return { ...emptyPractice(1, 1), questions, evidenceRequirements: [
      { code: "REPORT", name: "Follow-up report", instructions: "Include the latest review.", required: true, format: "FILE_OR_URL" as const, questionCodes: [questions[3].code] },
    ] };
  });
  const [selected, setSelected] = useState<string>();
  const question = practice.questions.find(item => item.clientKey === selected);
  return <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
    <QuestionDependenciesPreview practice={practice} onSelect={setSelected} />
    <PracticeEvidenceEditor requirements={practice.evidenceRequirements ?? []} questions={practice.questions}
      onChange={evidenceRequirements => setPractice(current => ({ ...current, evidenceRequirements }))} />
    {question && <QuestionEditor question={question} practice={practice} maxLevel={5} initialSection="dependencies"
      questionIndex={practice.questions.indexOf(question)} onClose={() => setSelected(undefined)} onDelete={() => setSelected(undefined)}
      onChange={next => setPractice(current => ({ ...current, questions: current.questions.map(item => item.clientKey === next.clientKey ? next : item) }))} />}
    <details><summary>Draft data (story inspection)</summary><pre data-testid="branching-draft" className="overflow-auto text-xs">{JSON.stringify(practice, null, 2)}</pre></details>
  </div>;
}

export const BranchingCreator: Story = { render: () => <BranchingWorkspace />, parameters: { layout: "fullscreen" } };
