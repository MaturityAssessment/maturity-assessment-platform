import type { Question, QuestionEvaluationResponse } from "@/api/types";

export interface AssessmentAssistantContextInput {
  modelName: string;
  dimensionName: string;
  moduleName: string;
  practiceName: string;
  practiceDescription?: string;
  question: Question;
  modelMaxLevel: number;
  evaluation?: QuestionEvaluationResponse;
}

export function buildAssessmentAssistantContext({
  modelName,
  dimensionName,
  moduleName,
  practiceName,
  practiceDescription,
  question,
  modelMaxLevel,
  evaluation,
}: AssessmentAssistantContextInput): string {
  const lines = [
    `Maturity model: ${modelName}`,
    `Location: ${dimensionName} > ${moduleName} > ${practiceName}`,
  ];

  if (practiceDescription?.trim()) {
    lines.push(`Practice description: ${practiceDescription.trim()}`);
  }

  lines.push(`Assessment item: ${question.text.trim()}`);
  lines.push(`Expected response: ${getResponseFormat(question, modelMaxLevel)}`);
  lines.push(`Required item: ${question.required ? "Yes" : "No"}`);
  lines.push(
    `Supporting evidence required: ${question.requiresEvidence ? "Yes" : "No"}`
  );

  if (question.help?.trim()) {
    lines.push(`Configured guidance: ${question.help.trim()}`);
  }

  if (evaluation?.reviewerNote?.trim()) {
    lines.push(`Evaluator feedback: ${evaluation.reviewerNote.trim()}`);
  }

  lines.push(
    "The user's draft response and uploaded evidence have not been shared. Ask for relevant details when needed and do not invent an answer on the user's behalf."
  );

  return lines.join("\n");
}

function getResponseFormat(question: Question, modelMaxLevel: number): string {
  switch (question.type) {
    case "boolean":
      return "Yes or No";
    case "likert":
      return `Scale with ${Math.max(2, question.scalePointCount ?? 5)} points`;
    case "multiple_choice":
      return question.choices?.length
        ? `One of: ${question.choices
            .map((choice) => choice.label)
            .join("; ")}`
        : "One configured choice";
    case "numeric":
      return formatRanges("Numeric value", question);
    case "percentage":
      return formatRanges("Percentage", question);
    case "open_answer":
      return "Written response";
    case "evidence":
      return "Supporting evidence upload";
  }
}

function formatRanges(label: string, question: Question): string {
  if (!Number.isInteger(question.rangeMin) || !Number.isInteger(question.rangeMax)) {
    return label;
  }
  const best = question.rangeHighValueIsMaximum
    ? question.rangeMax
    : question.rangeMin;
  return `${label}; whole number from ${question.rangeMin} to ${question.rangeMax}; ${best} represents the maximum score`;
}
