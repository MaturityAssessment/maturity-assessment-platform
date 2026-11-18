package com.master_thesis.maturity_assessment.maturity_models.models;

/** Content-addressed link to the exact flag rule approved by the model creator. */
public record ScoreLimit(String kind, Double value, ChildStateGatingRule childStateRule,
                         ConditionalGatingRule conditionalRule) {}
