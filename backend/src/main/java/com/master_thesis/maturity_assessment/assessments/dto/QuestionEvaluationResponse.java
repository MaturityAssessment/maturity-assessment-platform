package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class QuestionEvaluationResponse {
    private Long id;
    private String responseKey;
    private Long questionId;
    private Object response;
    private Double initialScore;
    private String respondentJustification;
    private String validationStatus;
    private Double manualScore;
    private String reviewerNote;
    private Boolean respondentUpdated;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
