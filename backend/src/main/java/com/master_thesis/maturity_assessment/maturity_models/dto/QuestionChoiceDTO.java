package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;

@Data
public class QuestionChoiceDTO {
    private String id;
    private String label;
    private Double score;
    /** Cumulative raw value, used only for multiple_selection. */
    private Double rawValue;
}
