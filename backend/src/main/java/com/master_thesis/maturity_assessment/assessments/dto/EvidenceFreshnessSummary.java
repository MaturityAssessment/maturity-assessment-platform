package com.master_thesis.maturity_assessment.assessments.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Derived metadata, never a persisted assessment status or score. */
public record EvidenceFreshnessSummary(
        LocalDate evaluatedOn, Instant calculatedAt, Instant nextRefreshAt,
        int requiredIndicatorCount, int outdatedIndicatorCount,
        int unknownDateIndicatorCount, int missingIndicatorCount,
        List<Indicator> indicators) {

    public record RecordFreshness(Long evidenceId, LocalDate collectedAt, String status,
                                  Long ageDays, LocalDate validThrough) {}

    public record Indicator(Long practiceId, String practiceName, String requirementCode,
                            String requirementName, boolean required, boolean satisfied,
                            String status, Integer maxAgeDays, LocalDate validThrough,
                            List<RecordFreshness> records) {}
}
