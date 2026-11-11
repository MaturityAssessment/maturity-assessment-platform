package com.master_thesis.maturity_assessment.assessments.services;

import com.master_thesis.maturity_assessment.assessments.dto.EvidenceFreshnessSummary.RecordFreshness;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/** Profile 1.1, clause 10: expiry is strictly age > maxAgeDays. */
public final class EvidenceFreshness {
    private EvidenceFreshness() {}

    public static RecordFreshness record(Long id, LocalDate collectedAt, Integer maxAgeDays, LocalDate referenceDate) {
        if (collectedAt == null || referenceDate == null) return new RecordFreshness(id, collectedAt, "UNKNOWN_DATE", null, null);
        long age = ChronoUnit.DAYS.between(collectedAt, referenceDate);
        LocalDate validThrough = maxAgeDays == null ? null : collectedAt.plusDays(maxAgeDays);
        return new RecordFreshness(id, collectedAt, maxAgeDays == null ? "NO_EXPIRY"
                : age > maxAgeDays ? "OUTDATED" : "CURRENT", age, validThrough);
    }

    public static String indicatorStatus(List<RecordFreshness> records) {
        if (records.isEmpty()) return "MISSING";
        if (records.stream().anyMatch(record -> "NO_EXPIRY".equals(record.status()))) return "NO_EXPIRY";
        if (records.stream().anyMatch(record -> "CURRENT".equals(record.status()))) return "CURRENT";
        // Unknown legacy dates cannot prove that *all* present records are old.
        if (records.stream().anyMatch(record -> "UNKNOWN_DATE".equals(record.status()))) return "UNKNOWN_DATE";
        return "OUTDATED";
    }
}
