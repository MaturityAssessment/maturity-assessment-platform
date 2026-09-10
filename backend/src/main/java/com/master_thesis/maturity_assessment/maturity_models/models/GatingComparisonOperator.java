package com.master_thesis.maturity_assessment.maturity_models.models;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum GatingComparisonOperator {
    BELOW("<"),
    BELOW_OR_EQUAL("<="),
    EQUAL("=="),
    ABOVE_OR_EQUAL(">="),
    ABOVE(">");

    private final String value;

    GatingComparisonOperator(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static GatingComparisonOperator fromValue(String value) {
        for (GatingComparisonOperator operator : values()) {
            if (operator.value.equals(value)) {
                return operator;
            }
        }
        throw new IllegalArgumentException("Unsupported gating comparison operator: " + value);
    }
}
