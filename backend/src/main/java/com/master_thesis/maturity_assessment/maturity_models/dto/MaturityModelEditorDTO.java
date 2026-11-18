package com.master_thesis.maturity_assessment.maturity_models.dto;

import com.master_thesis.maturity_assessment.maturity_models.models.AggregationRule;

import lombok.Data;
import com.master_thesis.maturity_assessment.maturity_models.models.EvidenceRequirement;

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
                private com.master_thesis.maturity_assessment.maturity_models.models.GatingRuleMetadata completionGatingMetadata;

        private Double minimumCoverage = 0.0;
        private Double minimumIncludedCount = 0.0;

        private List<com.master_thesis.maturity_assessment.maturity_models.models.ChildStateGatingRule> childStateGatingRules = new java.util.ArrayList<>();

        private List<com.master_thesis.maturity_assessment.maturity_models.models.ConditionalGatingRule> conditionalGatingRules = new java.util.ArrayList<>();
        private List<com.master_thesis.maturity_assessment.maturity_models.models.ScoreLimit> scoreLimits = new java.util.ArrayList<>();
        private List<EditorModuleDTO> modules = new ArrayList<>();
    }

    @Data
    public static class EditorModuleDTO {
        private Boolean visible = true;
        private List<String> prerequisiteModuleCodes = new ArrayList<>();
        private List<String> coRequisiteModuleCodes = new ArrayList<>();
        private List<String> mutexModuleCodes = new ArrayList<>();
        // Informational badges only; no behavioral constraints.
        private Boolean mandatoryBadge = false;
        private List<String> reinforcesModuleCodes = new ArrayList<>();
        private List<String> substitutesModuleCodes = new ArrayList<>();
        private String code;
        private String name;
        private String description;
        private Double weight;
        private AggregationRule aggregationRule;
                private com.master_thesis.maturity_assessment.maturity_models.models.GatingRuleMetadata completionGatingMetadata;

        private Double minimumCoverage = 0.0;
        private Double minimumIncludedCount = 0.0;

        private List<com.master_thesis.maturity_assessment.maturity_models.models.ChildStateGatingRule> childStateGatingRules = new java.util.ArrayList<>();

        private List<com.master_thesis.maturity_assessment.maturity_models.models.ConditionalGatingRule> conditionalGatingRules = new java.util.ArrayList<>();
        private List<com.master_thesis.maturity_assessment.maturity_models.models.ScoreLimit> scoreLimits = new java.util.ArrayList<>();
        private List<EditorPracticeDTO> practices = new ArrayList<>();
    }

    @Data
    public static class EditorPracticeDTO {
        private List<EvidenceRequirement> evidenceRequirements = new ArrayList<>();
        private Boolean requiresEvidence = false;
        private String code;
        private String name;
        private String description;
        private Double weight;
        private AggregationRule aggregationRule;
                private com.master_thesis.maturity_assessment.maturity_models.models.GatingRuleMetadata completionGatingMetadata;

        private Double minimumCoverage = 0.0;
        private Double minimumIncludedCount = 0.0;

        private List<com.master_thesis.maturity_assessment.maturity_models.models.ChildStateGatingRule> childStateGatingRules = new java.util.ArrayList<>();

        private List<com.master_thesis.maturity_assessment.maturity_models.models.ConditionalGatingRule> conditionalGatingRules = new java.util.ArrayList<>();
        private List<com.master_thesis.maturity_assessment.maturity_models.models.ScoreLimit> scoreLimits = new java.util.ArrayList<>();
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
        private DependencyCondition dependencyCondition;
        private Boolean required;
        private Boolean allowNotApplicable;
        private Double notApplicableScore;
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
