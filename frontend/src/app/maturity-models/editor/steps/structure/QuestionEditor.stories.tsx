import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { emptyPractice, emptyQuestion } from "../../model/editorDocument";
import QuestionEditor from "./QuestionEditor";

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
