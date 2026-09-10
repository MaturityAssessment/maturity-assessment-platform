package com.master_thesis.maturity_assessment.maturity_models.models;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum GatingScoreOperation {
    SET("set"),
    ADD("add"),
    SUBTRACT("subtract");

    private final String value;

    GatingScoreOperation(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static GatingScoreOperation fromValue(String value) {
        for (GatingScoreOperation operation : values()) {
            if (operation.value.equals(value)) {
                return operation;
            }
        }
        throw new IllegalArgumentException("Unsupported gating score operation: " + value);
    }
}
