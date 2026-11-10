package com.master_thesis.maturity_assessment.assessments.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;
import java.math.BigInteger;

/** Prevent Jackson's default coercion of strings, booleans and fractional IDs. */
public class QuestionReferenceIdDeserializer extends StdDeserializer<Long> {
    public QuestionReferenceIdDeserializer() {
        super(Long.class);
    }

    @Override
    public Long deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT) {
            return context.reportInputMismatch(Long.class, "Question references must be positive integer IDs.");
        }
        BigInteger value = parser.getBigIntegerValue();
        if (value.signum() <= 0 || value.compareTo(BigInteger.valueOf(Long.MAX_VALUE)) > 0) {
            return context.reportInputMismatch(Long.class, "Question references must be positive integer IDs.");
        }
        return value.longValue();
    }
}
