package com.master_thesis.maturity_assessment.assessments.models;

import java.util.List;

/** Immutable comparison saved alongside the final scoring snapshot. */
public record TargetProfileComparison(String status, String reason, String profileId, String profileName,
                                      List<RequirementResult> requirements) {
    public record RequirementResult(String elementType, String dimensionCode, String moduleCode,
                                    String name, double target, Double actual, String status, String reason) {}
}
