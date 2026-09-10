package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;

@Data
public class MaturityModelDTO {
    private Long id; // Optional for creation, required for updates

    private String name;
    private String description;
    private String changelogMarkdown;
    private Boolean isActive;
    private Boolean autoEvaluated;
    private Integer version;
    private Long baseModelId; // Links all versions of the same model
    private Long domainId; // Reference to the domain
    private DomainDTO domain; // Full domain object (for responses)
    private Long creatorId;
    private String creatorName;
    private LocalDateTime createdAt;
    private String updateMode; // REPLACED | VERSIONED (set on update endpoint responses)
    private Integer assessmentUsageCount; // Assessments using edited model id at update time
    private AggregationRule aggregationRule;

    private List<DimensionDTO> dimensions;

    /** Ordered maturity scale: numbers 1..N (at least 2, at most 12). */
    private List<MaturityLevelDTO> levels;
}
