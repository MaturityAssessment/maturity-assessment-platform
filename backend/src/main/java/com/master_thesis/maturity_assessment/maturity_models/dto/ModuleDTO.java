package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;
import java.util.List;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;

@Data
public class ModuleDTO {
    private Long dimensionId; // FK to parent Dimension
    private String code; // Unique code within the model
    private String name;
    private String description;

    // Weighting factor for aggregation (optional, defaults to 1.0)
    private Double weight;
    private AggregationRule aggregationRule;
    private List<GatingRuleDTO> gatingRules;

    /** Display order within the dimension (0-based); derived from JSON array order on write. */
    private Integer sortOrder;

    private List<PracticeDTO> practices;
}
