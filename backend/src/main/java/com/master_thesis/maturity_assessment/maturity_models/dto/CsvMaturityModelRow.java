package com.master_thesis.maturity_assessment.maturity_models.dto;

import lombok.Data;

@Data
public class CsvMaturityModelRow {
    private String modelName;
    private String modelDescription;
    private String modelAutoEvaluated;
    /** Optional JSON: [{"number":1,"name":"..."},...]; omit to use default 5-level scale */
    private String modelLevels;

    private String dimensionId;
    private String dimensionName;
    private String dimensionDescription;

    private String moduleCode;
    private String moduleName;
    private String moduleDescription;
    private String moduleWeight;

    private String practiceId;
    private String practiceCode;
    private String practiceName;
    private String practiceDescription;
    private String practiceWeight;

    private String questionWeight;
    private String questionCode;
    private String dependsOnQuestionCode;
    private String questionText;
    private String questionType;
    private String questionHelp;
    private String questionRequiresEvidence;
    private String questionRequired;
    /** JSON array of {"label","score"} when questionType is multiple_choice. */
    private String questionChoices;
    /** Legacy Scale point count column accepted for backward-compatible imports. */
    private String questionLikertScaleMax;
    private String questionScalePointCount;
    private String questionScaleMinLabel;
    private String questionScaleMaxLabel;
    private String questionScaleHighPointIsMaximum;
    private String questionRangeMin;
    private String questionRangeMax;
    private String questionRangeHighValueIsMaximum;
    /** Legacy maturity-level mappings accepted for backward-compatible imports. */
    private String questionRanges;
}
