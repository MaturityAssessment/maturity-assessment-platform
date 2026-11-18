package com.master_thesis.maturity_assessment.maturity_models.models;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Content-addressed link to the exact flag rule approved by the model creator. */
public record ScoreLimit(String kind, Double value, ChildStateGatingRule childStateRule,
                         ConditionalGatingRule conditionalRule,
                         @JsonInclude(JsonInclude.Include.NON_NULL) Double upperValue) {
    // Existing single-bound configurations and callers keep the original representation.
    public ScoreLimit(String kind, Double value, ChildStateGatingRule childStateRule,
                      ConditionalGatingRule conditionalRule) {
        this(kind, value, childStateRule, conditionalRule, null);
    }
}
