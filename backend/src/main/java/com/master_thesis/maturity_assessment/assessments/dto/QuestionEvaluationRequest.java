package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Data;

@Data
public class QuestionEvaluationRequest {
    private Long questionId;
    private String validationStatus;
    private Double manualScore;
    private String reviewerNote;
}
