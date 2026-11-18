package com.master_thesis.maturity_assessment.maturity_models.models;

import java.util.List;

/** Version-local profiling tree. Scores are normalized to 0..1. */
public record TargetProfileConfiguration(
        int version, String rootQuestionId, List<ProfilingQuestion> questions, List<TargetProfile> profiles) {
    public record ProfilingQuestion(String id, String text, List<Option> options) {}
    public record Option(String id, String label, Destination destination) {}
    /** type is question, profile, or none; none has no id. */
    public record Destination(String type, String id) {}
    public record TargetProfile(String id, String name, String description,
                                List<Requirement> requirements, Integer expectedLevel) {}
    public record Requirement(String elementType, String dimensionCode, String moduleCode, Double minimumScore) {}
}
