package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Data;

import java.util.Map;

@Data
public class ManualEvaluationRequest {
    private Map<String, Double> manualScores;
    private Map<String, QuestionEvaluationRequest> questionEvaluations;
    private String evaluatorInsight;
}
