import type { ReactNode } from "react";

export type QuestionResponseValue =
  | string
  | number
  | number[]
  | undefined;

export type QuestionCardStatus =
  | "unanswered"
  | "complete"
  | "disabled"
  | "accepted"
  | "flagged"
  | "flagged-updated"
  | "adjusted";

export type QuestionCardFeedbackTone =
  | "accepted"
  | "flagged"
  | "updated"
  | "adjusted";

export interface QuestionCardFeedbackModel {
  tone: QuestionCardFeedbackTone;
  title: string;
  note?: string;
  result?: string;
  readOnly?: boolean;
  prompt?: string;
}

export interface QuestionCardAnchors {
  root?: string;
  requirements?: string;
  actions?: string;
  guidance?: string;
}

export interface QuestionCardProps {
  title: string;
  instruction: string;
  status: QuestionCardStatus;
  required?: boolean;
  complete?: boolean;
  interactionDisabled?: boolean;
  disabledMessage?: string;
  guidance?: ReactNode;
  feedback?: QuestionCardFeedbackModel;
  onAskAssistant?: () => void;
  onClear?: () => void;
  anchors?: QuestionCardAnchors;
  children: ReactNode;
}

export interface QuestionInputProps<T extends QuestionResponseValue> {
  value: T;
  disabled?: boolean;
  name?: string;
  onChange: (value: T) => void;
}

export interface QuestionChoiceOption {
  label: string;
  value: number;
}
