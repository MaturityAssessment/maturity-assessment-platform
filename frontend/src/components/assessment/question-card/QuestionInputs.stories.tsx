import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { Question } from "@/api/types";
import AssessmentQuestionCard from "@/app/assessment/AssessmentQuestionCard";
import type { QuestionResponseValue } from "./types";

interface InputPreviewProps {
  inputType: Question["type"];
  withNA: boolean;
  required: boolean;
}

const examples: Record<Question["type"], Partial<Question>> = {
  boolean: { text: "Is the information security policy formally approved?" },
  likert: {
    text: "How consistently is the policy reviewed?",
    scalePointCount: 5,
    scaleMinLabel: "Never",
    scaleMaxLabel: "Always",
  },
  multiple_choice: {
    text: "How is the policy maintained?",
    choices: [
      { id: "formal", label: "Formal review process", score: 1 },
      { id: "informal", label: "Informal reviews", score: 0.5 },
      { id: "none", label: "No review process", score: 0 },
    ],
  },
  multiple_selection: {
    text: "Which policy controls are in place?",
    choices: [
      { label: "Documented approval", score: 0, rawValue: 2 },
      { label: "Staff training", score: 0, rawValue: 3 },
      { label: "Regular audits", score: 0, rawValue: 5 },
    ],
  },
  numeric: {
    text: "How many policy reviews were completed this year?",
    rangeMin: 0,
    rangeMax: 12,
  },
  percentage: {
    text: "What percentage of staff completed policy training?",
    rangeMin: 0,
    rangeMax: 100,
  },
  open_answer: { text: "Describe how the policy is reviewed." },
};

function Preview({ inputType, withNA, required }: InputPreviewProps) {
  const [value, setValue] = useState<QuestionResponseValue>();
  const question: Question = {
    id: 1001,
    text: "",
    type: inputType,
    weight: 1,
    help: "",
    ...examples[inputType],
    required,
    allowNotApplicable: withNA,
    notApplicableScore: withNA ? 0.5 : null,
  };

  return (
    <AssessmentQuestionCard
      question={question}
      fieldName="D1_M1_101_1001"
      value={value}
      disabled={false}
      respondentUpdated={false}
      onInputChange={(_field, nextValue) => setValue(nextValue)}
      onClearAnswer={() => setValue(undefined)}
    />
  );
}

const meta = {
  title: "Assessment/Question card/InputPreview",
  component: Preview,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="mx-auto max-w-3xl"><Story /></div>],
  argTypes: {
    inputType: {
      control: {
        type: "select",
        labels: {
          boolean: "Boolean",
          likert: "Scale",
          multiple_choice: "Single Choice",
          multiple_selection: "Multi Select",
          numeric: "Numeric",
          percentage: "Percentage",
          open_answer: "Open Answer",
        },
      },
      options: Object.keys(examples),
    },
    withNA: { control: "boolean" },
    required: { control: "boolean" },
  },
  args: { inputType: "boolean", withNA: false, required: false },
  render: (args) => <Preview key={`${args.inputType}-${args.withNA}`} {...args} />,
} satisfies Meta<typeof Preview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InputPreview: Story = { name: "InputPreview" };
