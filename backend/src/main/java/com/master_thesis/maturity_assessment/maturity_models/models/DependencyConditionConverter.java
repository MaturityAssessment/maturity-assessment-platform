package com.master_thesis.maturity_assessment.maturity_models.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.master_thesis.maturity_assessment.maturity_models.dto.DependencyCondition;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class DependencyConditionConverter implements AttributeConverter<DependencyCondition, String> {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(DependencyCondition condition) {
        if (condition == null) return null;
        try { return MAPPER.writeValueAsString(condition); }
        catch (Exception exception) { throw new IllegalArgumentException("Invalid dependency condition", exception); }
    }

    @Override
    public DependencyCondition convertToEntityAttribute(String json) {
        if (json == null) return null;
        try { return MAPPER.readValue(json, DependencyCondition.class); }
        catch (Exception exception) { throw new IllegalArgumentException("Invalid stored dependency condition", exception); }
    }
}
