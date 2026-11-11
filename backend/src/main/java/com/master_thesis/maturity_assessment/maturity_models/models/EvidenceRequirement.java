package com.master_thesis.maturity_assessment.maturity_models.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/** An ID-free, versioned requirement owned by one practice. */
@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceRequirement {
    @Column(name = "code", nullable = false, length = 64)
    private String code;
    @Column(name = "name", nullable = false, length = 255)
    private String name;
    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions = "";
    @Column(name = "required", nullable = false)
    private Boolean required = true;
    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false, length = 20)
    private Format format = Format.FILE_OR_URL;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 20)
    private Frequency frequency = Frequency.adhoc;

    @Column(name = "max_age_days")
    private Integer maxAgeDays;

    public enum Frequency { adhoc, monthly, quarterly, yearly }

    public EvidenceRequirement(String code, String name, String instructions, Boolean required, Format format) {
        this(code, name, instructions, required, format, Frequency.adhoc, null);
    }

    public Integer effectiveMaxAgeDays() {
        if (maxAgeDays != null) return maxAgeDays;
        return switch (frequency == null ? Frequency.adhoc : frequency) {
            case monthly -> 31;
            case quarterly -> 92;
            case yearly -> 366;
            case adhoc -> null;
        };
    }

    public enum Format { FILE, URL, FILE_OR_URL, ANY }

    public boolean accepts(String type) {
        return format == Format.ANY || (format == Format.FILE_OR_URL && ("FILE".equals(type) || "URL".equals(type)))
                || (format != null && format.name().equals(type));
    }

    public EvidenceRequirement copy() {
        return new EvidenceRequirement(code, name, instructions, required, format, frequency, maxAgeDays);
    }
}
