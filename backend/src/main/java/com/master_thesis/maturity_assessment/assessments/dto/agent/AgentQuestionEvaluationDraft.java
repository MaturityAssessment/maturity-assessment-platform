package com.master_thesis.maturity_assessment.assessments.dto.agent;

import lombok.Data;

@Data
public class AgentQuestionEvaluationDraft {
    private Long questionId;
    private String validationStatus;
    private Double manualScore;
    private String reviewerNote;
    private Double confidence;
    private String rationale;
}
