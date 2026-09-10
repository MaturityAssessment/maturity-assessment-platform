package com.master_thesis.maturity_assessment.assessments.dto.agent;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class AgentEvaluationDraftResponse {
    private Long assessmentId;
    private LocalDateTime generatedAt;
    private String model;
    private Double confidence;
    private String summary;
    private String finalRemarks;
    private Map<String, AgentQuestionEvaluationDraft> questionEvaluations;
    private List<AgentEvaluationWarning> warnings;
    private List<String> nextSteps;
    private List<AgentDocumentSummary> documentSummaries;
    private List<String> processingNotes;
}
