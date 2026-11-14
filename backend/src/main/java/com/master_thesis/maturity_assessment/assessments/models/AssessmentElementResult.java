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
        double coverage) {
}
