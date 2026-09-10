package com.master_thesis.maturity_assessment.assessments.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.Data;
import java.util.Map;
import java.util.Set;

@Data
@JsonIgnoreProperties(ignoreUnknown = false)
public class AssessmentRequest {
    private Long maturityModelId;
    private Map<String, QuestionResponseRequest> questionResponses;
    private Set<String> respondentUpdatedResponseKeys;

    @JsonSetter("responses")
    public void rejectLegacyResponses(Object ignored) {
        throw new IllegalArgumentException(
                "The legacy responses payload is no longer supported; use questionResponses."
        );
    }
}
