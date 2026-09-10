package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;
import java.util.List;
import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;

@Data
public class PracticeDTO {
    private Long id; // Optional for creation, required for updates
    private Long moduleId; // FK to parent Module
    private String code; // Stable public code within the model

    private String name;
    private String description;
    private Double weight;
    private AggregationRule aggregationRule;
    private List<GatingRuleDTO> gatingRules;

    private List<QuestionDTO> questions;
}
