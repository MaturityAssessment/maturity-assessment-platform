package com.master_thesis.maturity_assessment.assessments.dto;

import lombok.Data;

@Data
public class DimensionResultResponse {
    private String dimensionId;
    private String dimensionName;
    private String dimensionDescription;
    private Double averageScore;
    private Double percentageScore;
    private String maturityLevel;
    private Integer maturityLevelNumber;
    private Integer totalQuestions;
    private Double totalScore;
}
