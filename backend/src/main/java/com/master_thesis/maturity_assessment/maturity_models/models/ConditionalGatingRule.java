package com.master_thesis.maturity_assessment.maturity_models.models;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.io.IOException;
import java.util.Set;

/** Versioned, declarative condition tree; schema/type/reference validation runs on model writes. */
@JsonDeserialize(using = ConditionalGatingRule.Deserializer.class)
public record ConditionalGatingRule(Integer version, JsonNode when, String effect, String name, String description) {
    public ConditionalGatingRule(Integer version, JsonNode when, String effect) { this(version, when, effect, null, null); }
    public static class Deserializer extends JsonDeserializer<ConditionalGatingRule> {
        @Override public ConditionalGatingRule deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            JsonNode node = parser.readValueAsTree();
            if (!node.isObject() || node.size() < 3 || node.size() > 5 || !node.has("when") || !node.has("effect")
                    || !node.path("version").isIntegralNumber() || !node.path("version").canConvertToInt()
                    || !node.path("effect").isTextual()) {
                throw JsonMappingException.from(parser, "A conditional gating rule requires exactly version (integer), when, and effect.");
            }
            var fields = node.fieldNames();
            while (fields.hasNext()) if (!Set.of("version", "when", "effect", "name", "description").contains(fields.next()))
                throw JsonMappingException.from(parser, "Unknown conditional gating rule property.");
            for (String key : Set.of("name", "description")) if (node.hasNonNull(key) && !node.get(key).isTextual()) throw JsonMappingException.from(parser, key + " must be text.");
            return new ConditionalGatingRule(node.get("version").intValue(), node.get("when"), node.get("effect").textValue(), node.path("name").isTextual() ? node.get("name").textValue() : null, node.path("description").isTextual() ? node.get("description").textValue() : null);
        }
    }
}
