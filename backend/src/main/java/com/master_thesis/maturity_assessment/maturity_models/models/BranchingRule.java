package com.master_thesis.maturity_assessment.maturity_models.models;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.io.IOException;
import java.util.Set;

/** Answer-only expression. Parent codes are local to the owning practice. */
@JsonDeserialize(using = BranchingRule.Deserializer.class)
public record BranchingRule(Integer version, JsonNode when) {
    public static class Deserializer extends JsonDeserializer<BranchingRule> {
        @Override public BranchingRule deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            JsonNode node = parser.readValueAsTree();
            if (!node.isObject() || node.size() != 2 || !node.path("version").isIntegralNumber()
                    || !node.path("version").canConvertToInt() || !node.hasNonNull("when"))
                throw JsonMappingException.from(parser, "Branching requires version (integer) and when.");
            var names = node.fieldNames();
            while (names.hasNext()) if (!Set.of("version", "when").contains(names.next()))
                throw JsonMappingException.from(parser, "Unknown branching property.");
            return new BranchingRule(node.get("version").intValue(), node.get("when"));
        }
    }
}
