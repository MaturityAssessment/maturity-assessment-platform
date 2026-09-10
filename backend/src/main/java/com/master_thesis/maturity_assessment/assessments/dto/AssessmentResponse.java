package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class AssessmentResponse {
    private Long id;
    private Double overallAverage;
    private Double overallPercentageScore;
    private String overallMaturityLevel;
    private Boolean isCompleted;
    private String status; // New field
    private Long maturityModelId;
    /** Version of the maturity model used for this assessment. */
    private Integer maturityModelVersion;
    /** Domain name of the maturity model used for this assessment (batch-populated on list/detail). */
    private String domainName;
    private String evaluatorInsight;
    private Map<String, QuestionEvaluationResponse> questionEvaluations;
    private List<EvidenceDTO> evidence;
    private List<DimensionResultResponse> dimensionResults;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String userEmail; // User email (populated when fetching all assessments)
    private Long userId; // User ID (populated when fetching all assessments)
    private Long campaignId;
    private String campaignName;
    private Long campaignParticipantId;
}
