package com.master_thesis.maturity_assessment.assessments.models;

/** Evaluation snapshot. Completion metrics are percentages; scores are normalized to 0..1. */
public record AssessmentElementResult(
        String elementType,
        String dimensionId,
        String moduleCode,
        String practiceCode,
        String questionCode,
        String responseKey,
        String name,
        String state,
        Double normalizedScore,
        double includedCount,
        double coverage,
        Boolean visible,
        String scoreSource) {
    public AssessmentElementResult(String elementType, String dimensionId, String moduleCode, String practiceCode,
            String questionCode, String responseKey, String name, String state, Double normalizedScore,
            double includedCount, double coverage) {
        this(elementType, dimensionId, moduleCode, practiceCode, questionCode, responseKey, name, state, normalizedScore,
                includedCount, coverage, null, null);
    }
}
