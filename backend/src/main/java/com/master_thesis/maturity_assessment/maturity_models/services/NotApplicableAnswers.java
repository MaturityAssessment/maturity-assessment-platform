package com.master_thesis.maturity_assessment.maturity_models.services;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

/** A tagged answer preserves N/A independently of scores and free-text answers. */
public final class NotApplicableAnswers {
    private NotApplicableAnswers() {}

    public static boolean isAnswer(Object value) {
        if (value instanceof JsonNode node) {
            return node.isObject() && node.size() == 1
                    && node.path("notApplicable").isBoolean() && node.path("notApplicable").booleanValue();
        }
        return Map.of("notApplicable", true).equals(value);
    }
}
