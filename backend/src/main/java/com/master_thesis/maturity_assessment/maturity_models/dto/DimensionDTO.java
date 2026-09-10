package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;
import java.util.List;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;

@Data
public class DimensionDTO {
    private String id; // Optional for creation, required for updates

    private String name;
    private String description;
    private Double weight;
    private AggregationRule aggregationRule;
    private List<MappingRuleDTO> mappingRules;
    private List<GatingRuleDTO> gatingRules;

    /** Display order within the model (0-based); derived from JSON array order on write. */
    private Integer sortOrder;

    private List<ModuleDTO> modules;
}
