import type { Meta, StoryObj } from "@storybook/react";
import { QuestionCard } from "./QuestionCard";
import { BooleanQuestionInput } from "./BooleanQuestionInput";

const meta = {
  title: "Assessment/Question card/Card",
  component: QuestionCard,
  parameters: { layout: "padded" },
  args: {
    title: "Is the information security policy formally approved?",
    instruction: "Yes or no",
    status: "unanswered",
    required: true,
    complete: false,
    children: (
      <BooleanQuestionInput
        value={undefined}
        onChange={() => undefined}
      />
    ),
  },
  tags: ["autodocs"],
} satisfies Meta<typeof QuestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unanswered: Story = {};

export const Complete: Story = {
  args: {
    status: "complete",
    complete: true,
    children: (
      <BooleanQuestionInput value={1} onChange={() => undefined} />
    ),
  },
};

export const Disabled: Story = {
  args: {
    status: "disabled",
    interactionDisabled: true,
    disabledMessage: "Available when the related question is answered Yes.",
  },
};

export const Accepted: Story = {
  args: {
    status: "accepted",
    interactionDisabled: true,
    complete: true,
    feedback: {
      tone: "accepted",
      title: "Accepted by evaluator",
      note: "The submitted evidence supports this response.",
      readOnly: true,
    },
  },
};

export const Flagged: Story = {
  args: {
    status: "flagged",
    complete: true,
    feedback: {
      tone: "flagged",
      title: "Changes requested",
      note: "Please clarify who approves the policy.",
      prompt:
        "Update this answer or the shared practice evidence to mark it ready for review.",
    },
  },
};

export const FlaggedUpdated: Story = {
  args: {
    status: "flagged-updated",
    complete: true,
    feedback: {
      tone: "updated",
      title: "Requested update completed",
      note: "Please clarify who approves the policy.",
    },
  },
};

export const Adjusted: Story = {
  args: {
    status: "adjusted",
    interactionDisabled: true,
    complete: true,
    feedback: {
      tone: "adjusted",
      title: "Adjusted by evaluator",
      note: "The documented process is partially implemented.",
      result: "Evaluator result: Incorrect",
    },
  },
};

export const WithActionsAndGuidance: Story = {
  args: {
    guidance: "Use the latest approved policy version when answering.",
    onAskAssistant: () => undefined,
    onClear: () => undefined,
  },
};
