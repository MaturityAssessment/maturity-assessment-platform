import type {
  AgentDocumentSummary,
  AssessmentResponse,
  Evidence,
  MaturityModel,
  Question,
  QuestionEvaluationStatus,
} from "@/api/types";

export type AssessmentDetail = AssessmentResponse;

export type EvaluationTab = "general" | `dimension:${string}` | "results";

export interface AgentWarning {
  severity: "low" | "medium" | "high";
  questionId?: number;
  responseKey?: string;
  message: string;
  recommendation?: string;
}

export interface AgentInconsistency {
  area: string;
  observation: string;
  evidence?: string;
}

export interface AgentReport {
  assessmentId: number;
  summary: string;
  warnings: AgentWarning[];
  inconsistencies: AgentInconsistency[];
  nextSteps: string[];
  source?: "import" | "local-agent";
  generatedAt?: string;
  model?: string | null;
  confidence?: number | null;
  documentSummaries?: AgentDocumentSummary[];
  processingNotes?: string[];
}

export interface EvaluationQuestion {
  responseKey: string;
  questionId: number;
  question: Question;
  dimensionId: string;
  dimensionName: string;
  moduleName: string;
  practiceName: string;
  responseValue: unknown;
  initialScore: number | null;
  evidence: Evidence[];
  requiresManualScore: boolean;
}

export interface EvaluationPracticeGroup {
  moduleName: string;
  practiceName: string;
  questions: EvaluationQuestion[];
}

export interface EvaluationDimension {
  id: string;
  name: string;
  description?: string | null;
  groups: EvaluationPracticeGroup[];
}

export interface QuestionReviewDraft {
  validationStatus?: QuestionEvaluationStatus;
  manualScore?: number;
  reviewerNote: string;
}

export interface EvaluationProgress {
  total: number;
  reviewed: number;
  missingStatus: number;
  missingManualScores: number;
  missingNotes: number;
  flagged: number;
  adjusted: number;
}

export interface EvaluationModel {
  assessment: AssessmentDetail;
  maturityModel: MaturityModel | null;
  evidence: Evidence[];
  dimensions: EvaluationDimension[];
  questions: EvaluationQuestion[];
}
