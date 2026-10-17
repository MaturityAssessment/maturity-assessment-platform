package com.master_thesis.maturity_assessment.maturity_models.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import java.io.IOException;
import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DependencyCondition {
    private String type;
    @JsonDeserialize(contentUsing = BooleanAnswerDeserializer.class)
    private List<Boolean> answers;
    @JsonDeserialize(contentUsing = OptionIdDeserializer.class)
    private List<String> optionIds;
    @JsonDeserialize(contentUsing = ScalePointDeserializer.class)
    private List<Integer> points;

    public static class ScalePointDeserializer extends JsonDeserializer<Integer> {
        @Override public Integer deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT) return (Integer) context.handleUnexpectedToken(Integer.class, parser);
            return parser.getIntValue();
        }
    }

    public static class BooleanAnswerDeserializer extends JsonDeserializer<Boolean> {
        @Override public Boolean deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (!parser.hasToken(JsonToken.VALUE_TRUE) && !parser.hasToken(JsonToken.VALUE_FALSE)) return (Boolean) context.handleUnexpectedToken(Boolean.class, parser);
            return parser.getBooleanValue();
        }
    }

    public static class OptionIdDeserializer extends JsonDeserializer<String> {
        @Override public String deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (!parser.hasToken(JsonToken.VALUE_STRING)) return (String) context.handleUnexpectedToken(String.class, parser);
            return parser.getText();
        }
    }

    public static DependencyCondition affirmative() {
        DependencyCondition condition = new DependencyCondition();
        condition.setType("boolean");
        condition.setAnswers(List.of(true));
        return condition;
    }
}
