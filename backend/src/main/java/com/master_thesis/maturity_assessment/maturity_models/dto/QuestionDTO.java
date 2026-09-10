package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;

import java.util.List;

@Data
public class QuestionDTO {
    private Long id; // Database primary key (unique identifier)
    private Long practiceId; // FK to parent Practice
    private String code; // Stable public code within the model
    private Integer sortOrder;

    private Double weight;
    private String text;
    private String type;
    private String help;
    private Long dependsOnQuestionId; // Reference to parent question ID (numeric) within same practice
    private String dependsOnQuestionCode; // Stable editor/API dependency reference
    private Boolean requiresEvidence;
    private Boolean required;
    /** For boolean questions, the answer that receives normalized score 1. */
    private Boolean booleanCorrectAnswer;
    /** Options for type {@code multiple_choice}: each has a label and normalized score from 0 to 1. */
    private List<QuestionChoiceDTO> choices;
    private Integer scalePointCount;
    private String scaleMinLabel;
    private String scaleMaxLabel;
    private Boolean scaleHighPointIsMaximum;
    /** Inclusive integer bounds and direction for numeric and percentage questions. */
    private Integer rangeMin;
    private Integer rangeMax;
    private Boolean rangeHighValueIsMaximum;
}
