package com.master_thesis.maturity_assessment.maturity_models.models;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum GatingSelection {
    SPECIFIC_CHILD("specificChild"),
    ANY_CHILD("anyChild"),
    ALL_CHILDREN("allChildren");

    private final String value;

    GatingSelection(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static GatingSelection fromValue(String value) {
        for (GatingSelection selection : values()) {
            if (selection.value.equals(value)) {
                return selection;
            }
        }
        throw new IllegalArgumentException("Unsupported gating selection: " + value);
    }
}
