export interface UserDTO {
  id: number;
  email: string;
  name?: string | null;
  organizationName?: string | null;
  role: "ADMIN" | "USER" | "CURATOR";
  approvalStatus: "PENDING" | "APPROVED";
  helpBalloonsEnabled: boolean;
  completedHelpTours: Record<string, number>;
  dismissedHelpTourPrompts: Record<string, number>;
}

export interface MaturityLevel {
  number: number;
  name: string;
  description?: string | null;
}

export type AggregationRule =
  | "AVERAGE"
  | "WEIGHTED_AVERAGE"
  | "MINIMUM"
  | "MAXIMUM"
  | "SUM"
  | "MEDIAN";

export interface MappingRule {
  levelNumber: number;
  /** Inclusive lower bound on the normalized 0-1 dimension score. */
  minimumScore: number;
}

export type GatingSelection = "specificChild" | "anyChild" | "allChildren";
export type GatingComparisonOperator = "<" | "<=" | "==" | ">=" | ">";
export type GatingScoreOperation = "set" | "add" | "subtract";

export interface GatingRule {
  order: number;
  selection: GatingSelection;
  childCode?: string;
  operator: GatingComparisonOperator;
  threshold: number;
  operation: GatingScoreOperation;
  value: number;
}

export interface QuestionChoice {
  label: string;
  score: number;
}

export interface Question {
  id?: number; // Numeric database ID (unique identifier)
  practiceId?: number; // FK to parent Practice
  code?: string;
  sortOrder?: number;
  weight: number;
  text: string;
  type:
    | "boolean"
    | "likert"
    | "multiple_choice"
    | "numeric"
    | "percentage"
    | "open_answer"
    | "evidence";
  help: string;
  dependsOnQuestionId?: number; // Reference to parent question ID (numeric) within same practice
  dependsOnQuestionCode?: string;
  requiresEvidence?: boolean; // Whether this question requires evidence upload
  required?: boolean; // Whether this question must be answered
  /** Boolean answer that receives normalized score 1; the other receives 0. */
  booleanCorrectAnswer?: boolean;
  /** Custom options with normalized scores when type is multiple_choice. */
  choices?: QuestionChoice[];
  /** Independent configuration for Scale (internally `likert`) questions. */
  scalePointCount?: number;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  scaleHighPointIsMaximum?: boolean;
  /** Inclusive integer bounds and scoring direction for numeric/percentage questions. */
  rangeMin?: number;
  rangeMax?: number;
  rangeHighValueIsMaximum?: boolean;
  /** Stable key for list identity (DnD); not sent to API */
  clientKey?: string;
}

export interface Evidence {
  id: number;
  assessmentId: number;
  questionId: number;
  /** Ephemeral client identity echoed by draft saves for safe reconciliation. */
  clientKey?: string | null;
  description: string;
  evidenceType: "FILE" | "URL";
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  url?: string | null;
  createdAt: string;
  downloadUrl?: string | null;
}

export interface AssessmentEvidenceInputItem {
  id: string;
  evidenceId?: number;
  questionId: number;
  type: "file" | "link";
  description: string;
  file: File | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  url: string;
  downloadUrl?: string | null;
}

export interface AssessmentEvidenceMetadataItem {
  evidenceId?: number;
  itemKey?: string;
  clientKey?: string;
  questionId: number;
  type: "FILE" | "URL";
  description: string;
  url?: string;
}

export interface Practice {
  id?: number; // Numeric database ID (unique identifier)
  moduleId?: number; // FK to parent Module
  code?: string;
  name: string;
  description?: string;
  weight?: number;
  aggregationRule?: AggregationRule;
  gatingRules?: GatingRule[];
  questions: Question[];
}

export interface Module {
  dimensionId?: number; // FK to parent Dimension
  code?: string;
  name: string;
  description?: string;
  weight?: number; // For aggregation, defaults to 1.0
  aggregationRule?: AggregationRule;
  gatingRules?: GatingRule[];
  /** 0-based order within the dimension (from API / persisted). */
  sortOrder?: number;
  practices: Practice[];
}

export interface Dimension {
  id?: string;
  name: string;
  description?: string | null;
  weight?: number;
  aggregationRule?: AggregationRule;
  mappingRules?: MappingRule[];
  gatingRules?: GatingRule[];
  /** 0-based order within the model (from API / persisted). */
  sortOrder?: number;
  modules: Module[];
}

export interface AssessmentData {
  organization_name?: string;
  assessor_name?: string;
  [key: string]: any;
}

export interface AssessmentResponse {
  id: number;
  overallAverage: number;
  overallPercentageScore?: number;
  overallMaturityLevel: string;
  isCompleted: boolean;
  status?: "DRAFT" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "COMPLETED";
  maturityModelId?: number;
  /** Version of the maturity model used for this assessment (from API). */
  maturityModelVersion?: number;
  /** Domain of the maturity model used for this assessment (from API). */
  domainName?: string | null;
  evaluatorInsight?: string | null;
  questionEvaluations?: Record<string, QuestionEvaluationResponse>;
  evidence?: Evidence[];
  dimensionResults?: DimensionResultResponse[];
  createdAt: string;
  updatedAt?: string;
  userEmail?: string; // User email (populated when fetching all assessments)
  userId?: number; // User ID (populated when fetching all assessments)
  campaignId?: number;
  campaignName?: string;
  campaignParticipantId?: number;
}

export interface DimensionResultResponse {
  dimensionId: string;
  dimensionName: string;
  dimensionDescription?: string | null;
  averageScore: number;
  percentageScore?: number | null;
  maturityLevel: string;
  maturityLevelNumber?: number | null;
  totalQuestions: number;
  totalScore: number;
}

export type QuestionEvaluationStatus = "ACCEPTED" | "ADJUSTED" | "FLAGGED";

export interface QuestionResponseRequest {
  questionId: number;
  response: unknown;
  respondentJustification?: string;
}

export interface QuestionEvaluationRequest {
  questionId?: number;
  validationStatus?: QuestionEvaluationStatus;
  manualScore?: number;
  reviewerNote?: string;
}

export interface QuestionEvaluationResponse {
  id?: number;
  responseKey: string;
  questionId: number;
  response?: unknown;
  initialScore?: number | null;
  respondentJustification?: string | null;
  validationStatus?: QuestionEvaluationStatus | null;
  manualScore?: number | null;
  reviewerNote?: string | null;
  respondentUpdated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManualEvaluationRequest {
  manualScores: Record<string, number>;
  questionEvaluations?: Record<string, QuestionEvaluationRequest>;
  evaluatorInsight?: string;
}

export interface AgentDocumentSummary {
  evidenceId?: number | null;
  questionId?: number | null;
  evidenceType?: string | null;
  fileName?: string | null;
  urlHost?: string | null;
  urlPath?: string | null;
  summary?: string | null;
  extractedCharacters?: number | null;
  truncated?: boolean | null;
  warning?: string | null;
}

export interface AgentEvaluationWarning {
  severity: "low" | "medium" | "high" | string;
  questionId?: number | null;
  responseKey?: string | null;
  message: string;
  recommendation?: string | null;
}

export interface AgentQuestionEvaluationDraft extends QuestionEvaluationRequest {
  confidence?: number | null;
  rationale?: string | null;
}

export interface AgentEvaluationDraftResponse {
  assessmentId: number;
  generatedAt?: string;
  model?: string | null;
  confidence?: number | null;
  summary: string;
  finalRemarks?: string | null;
  questionEvaluations: Record<string, AgentQuestionEvaluationDraft>;
  warnings: AgentEvaluationWarning[];
  nextSteps: string[];
  documentSummaries: AgentDocumentSummary[];
  processingNotes: string[];
}

export interface Domain {
  id: number;
  name: string;
  description?: string;
  iconKey?: string;
  colorKey?: string;
  maturityModelCount?: number;
  hasActiveMaturityModel?: boolean;
}

export interface CreateDomainRequest {
  name: string;
  description?: string;
  iconKey?: string;
  colorKey?: string;
}

export interface UpdateDomainAppearanceRequest {
  iconKey: string;
  colorKey: string;
}

export interface MaturityModel {
  id: number;
  name: string;
  description: string;
  changelogMarkdown?: string | null;
  isActive: boolean;
  autoEvaluated?: boolean;
  version?: number;
  baseModelId?: number;
  creatorId?: number;
  creatorName?: string | null;
  createdAt?: string;
  updateMode?: "REPLACED" | "VERSIONED";
  assessmentUsageCount?: number;
  aggregationRule?: AggregationRule;
  domainId?: number;
  domain?: Domain;
  /** Maturity scale 1..N (at least 2); used only for dimension and overall results. */
  levels?: MaturityLevel[];
  dimensions: Dimension[];
}

export interface MaturityModelSummary {
  id: number;
  name: string;
  description: string;
  domainIconKey?: string;
  domainColorKey?: string;
  dimensionCount: number;
  moduleCount: number;
  totalQuestions: number;
  levelCount: number;
  isActive: boolean;
  autoEvaluated?: boolean;
  version?: number;
  baseModelId?: number;
  domainId?: number;
  domainName?: string;
  creatorName?: string | null;
  createdAt: string;
}

export type CampaignAssessmentStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "COMPLETED";

export interface CampaignParticipant {
  id: number;
  email: string;
  completed: boolean;
  assessmentId?: number | null;
  assessmentStatus?: CampaignAssessmentStatus | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface CampaignSummary {
  id: number;
  name: string;
  endsAt: string;
  maturityModelId: number;
  maturityModelName: string;
  maturityModelVersion: number;
  participantCount: number;
  completedParticipantCount: number;
  createdAt: string;
}

export interface CampaignDetail {
  id: number;
  name: string;
  endsAt: string;
  maturityModelId: number;
  maturityModelName: string;
  maturityModelVersion: number;
  createdAt: string;
  updatedAt: string;
  participants: CampaignParticipant[];
}

export interface CampaignMaturityLevelResult {
  maturityLevel: string;
  participantCount: number;
  percentage: number;
}

export interface CampaignDimensionResult {
  dimensionId: string;
  dimensionName: string;
  averageScore: number;
  responseCount: number;
}

export interface CampaignParticipantResult {
  participantId?: number | null;
  email: string;
  assessmentId: number;
  overallScore: number;
  overallMaturityLevel?: string | null;
  evaluatedAt?: string | null;
}

export interface CampaignResults {
  campaignId: number;
  participantCount: number;
  submittedParticipantCount: number;
  evaluatedParticipantCount: number;
  overallAverage?: number | null;
  maturityLevels: CampaignMaturityLevelResult[];
  dimensions: CampaignDimensionResult[];
  participants: CampaignParticipantResult[];
}

export interface CreateCampaignRequest {
  name: string;
  endsAt: string;
  maturityModelId: number;
  participantEmails: string[];
}

export interface CampaignInvitationResponse {
  participantId: number;
  invitationToken: string;
}

export interface CampaignAssessmentSession {
  campaignName: string;
  participantEmail: string;
  endsAt: string;
  assessment: AssessmentResponse;
}

export interface PracticeForm {
  id?: number; // Numeric database ID (unique identifier)
  moduleId?: number; // FK to parent Module
  code?: string;
  name: string;
  description?: string;
  weight?: number;
  questions: Question[];
}

export interface ModuleForm {
  code?: string;
  name: string;
  description?: string;
  weight?: number;
  sortOrder?: number;
  practices: PracticeForm[];
}

export interface DimensionForm {
  id?: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  modules: ModuleForm[];
}

export interface MaturityModelForm {
  name: string;
  description: string;
  changelogMarkdown?: string;
  autoEvaluated?: boolean;
  domainId?: number;
  aggregationRule?: AggregationRule;
  levels: MaturityLevel[];
  dimensions: DimensionForm[];
}

export interface CsvUploadResponse {
  success: boolean;
  message: string;
  maturityModel?: MaturityModel;
  errorDetails?: string;
}

export type ModelEditorQuestionType = Question["type"];

export interface ModelEditorQuestion {
  clientKey: string;
  code: string;
  codeLocked?: boolean;
  weight: number;
  text: string;
  type: ModelEditorQuestionType;
  help: string;
  dependsOnQuestionCode?: string;
  requiresEvidence: boolean;
  required: boolean;
  booleanCorrectAnswer: boolean;
  choices?: QuestionChoice[];
  scalePointCount: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  scaleHighPointIsMaximum: boolean;
  rangeMin: number;
  rangeMax: number;
  rangeHighValueIsMaximum: boolean;
}

export interface ModelEditorPractice {
  clientKey: string;
  code: string;
  codeLocked?: boolean;
  name: string;
  description: string;
  weight: number;
  aggregationRule: AggregationRule;
  gatingRules: GatingRule[];
  questions: ModelEditorQuestion[];
}

export interface ModelEditorModule {
  clientKey: string;
  code: string;
  codeLocked?: boolean;
  name: string;
  description: string;
  weight: number;
  aggregationRule: AggregationRule;
  gatingRules: GatingRule[];
  practices: ModelEditorPractice[];
}

export interface ModelEditorDimension {
  clientKey: string;
  code: string;
  codeLocked?: boolean;
  name: string;
  description: string;
  weight: number;
  aggregationRule: AggregationRule;
  mappingRules: MappingRule[];
  gatingRules: GatingRule[];
  modules: ModelEditorModule[];
}

export interface MaturityModelEditorDocument {
  name: string;
  description: string;
  changelogMarkdown: string;
  autoEvaluated: boolean;
  domainId?: number;
  aggregationRule: AggregationRule;
  levels: MaturityLevel[];
  dimensions: ModelEditorDimension[];
}

export interface MaturityModelEditorImportResponse {
  success: boolean;
  message: string;
  document?: Omit<MaturityModelEditorDocument, "dimensions"> & {
    dimensions: Array<
      Omit<ModelEditorDimension, "clientKey" | "modules"> & {
        modules: Array<
          Omit<ModelEditorModule, "clientKey" | "practices"> & {
            practices: Array<
              Omit<ModelEditorPractice, "clientKey" | "questions"> & {
                questions: Array<Omit<ModelEditorQuestion, "clientKey">>;
              }
            >;
          }
        >;
      }
    >;
  };
  warnings?: string[];
  errorDetails?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: "ADMIN" | "USER" | "CURATOR";
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: "ADMIN" | "USER" | "CURATOR";
}

export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
