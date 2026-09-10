package com.master_thesis.maturity_assessment.maturity_models.dto;

import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * ID-free write/read contract used by the maturity-model editor.
 * Database primary keys and foreign keys deliberately do not cross this boundary.
 */
@Data
public class MaturityModelEditorDTO {
    private String name;
    private String description;
    private String changelogMarkdown;
    private Boolean autoEvaluated;
    private Long domainId;
    private AggregationRule aggregationRule;
    private List<MaturityLevelDTO> levels = new ArrayList<>();
    private List<EditorDimensionDTO> dimensions = new ArrayList<>();

    @Data
    public static class EditorDimensionDTO {
        private String code;
        private String name;
        private String description;
        private Double weight;
        private AggregationRule aggregationRule;
        private List<MappingRuleDTO> mappingRules = new ArrayList<>();
        private List<GatingRuleDTO> gatingRules = new ArrayList<>();
        private List<EditorModuleDTO> modules = new ArrayList<>();
    }

    @Data
    public static class EditorModuleDTO {
        private String code;
        private String name;
        private String description;
        private Double weight;
        private AggregationRule aggregationRule;
        private List<GatingRuleDTO> gatingRules = new ArrayList<>();
        private List<EditorPracticeDTO> practices = new ArrayList<>();
    }

    @Data
    public static class EditorPracticeDTO {
        private String code;
        private String name;
        private String description;
        private Double weight;
        private AggregationRule aggregationRule;
        private List<GatingRuleDTO> gatingRules = new ArrayList<>();
        private List<EditorQuestionDTO> questions = new ArrayList<>();
    }

    @Data
    public static class EditorQuestionDTO {
        private String code;
        private Double weight;
        private String text;
        private String type;
        private String help;
        private String dependsOnQuestionCode;
        private Boolean requiresEvidence;
        private Boolean required;
        private Boolean booleanCorrectAnswer;
        private List<QuestionChoiceDTO> choices;
        private Integer scalePointCount;
        private String scaleMinLabel;
        private String scaleMaxLabel;
        private Boolean scaleHighPointIsMaximum;
        private Integer rangeMin;
        private Integer rangeMax;
        private Boolean rangeHighValueIsMaximum;
    }
}
