import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  BooleanQuestionInput,
  MultiSelectQuestionInput,
  NumericQuestionInput,
  OpenAnswerQuestionInput,
  PercentageQuestionInput,
  ScaleQuestionInput,
  SingleChoiceQuestionInput,
} from "./index";

const meta = {
  title: "Assessment/Question card/Inputs",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const options = [
  { label: "Defined and documented", value: 1 },
  { label: "Informally established", value: 0.5 },
  { label: "Not established", value: 0 },
];

export const Boolean: Story = {
  render: () => <BooleanExample />,
};

export const Scale: Story = {
  render: () => <ScaleExample />,
};

export const SingleChoice: Story = {
  render: () => <SingleChoiceExample />,
};

export const MultiSelect: Story = {
  render: () => <MultiSelectExample />,
};

export const Numeric: Story = {
  render: () => <NumericExample />,
};

export const Percentage: Story = {
  render: () => <PercentageExample />,
};

export const OpenAnswer: Story = {
  render: () => <OpenAnswerExample />,
};


function BooleanExample() {
  const [value, setValue] = useState<number>();
  return <BooleanQuestionInput value={value} onChange={setValue} />;
}

function ScaleExample() {
  const [value, setValue] = useState<number>();
  return (
    <ScaleQuestionInput
      value={value}
      pointCount={5}
      minLabel="Ad hoc"
      maxLabel="Optimized"
      onChange={setValue}
    />
  );
}

function SingleChoiceExample() {
  const [value, setValue] = useState<number>();
  return (
    <SingleChoiceQuestionInput
      value={value}
      options={options}
      onChange={setValue}
    />
  );
}

function MultiSelectExample() {
  const [value, setValue] = useState<number[]>();
  return (
    <MultiSelectQuestionInput
      value={value}
      options={options.map((option, index) => ({
        label: option.label,
        value: index,
      }))}
      onChange={setValue}
    />
  );
}

function NumericExample() {
  const [value, setValue] = useState<string | number>();
  return (
    <NumericQuestionInput
      value={value}
      min={0}
      max={20}
      invalid={typeof value === "number" && value > 20}
      onChange={setValue}
    />
  );
}

function PercentageExample() {
  const [value, setValue] = useState<string | number>();
  return (
    <PercentageQuestionInput
      value={value}
      min={0}
      max={100}
      onChange={setValue}
    />
  );
}

function OpenAnswerExample() {
  const [value, setValue] = useState<string>();
  return (
    <OpenAnswerQuestionInput
      value={value}
      maxLength={500}
      onChange={setValue}
    />
  );
}
