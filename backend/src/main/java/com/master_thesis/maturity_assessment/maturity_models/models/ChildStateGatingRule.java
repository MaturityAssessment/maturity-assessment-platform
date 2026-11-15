package com.master_thesis.maturity_assessment.maturity_models.models;

/** A predicate over visible direct children, with an effect on the owning aggregate. */
public record ChildStateGatingRule(String quantifier, String state, String effect, String name, String description) {
    public ChildStateGatingRule(String quantifier, String state, String effect) { this(quantifier, state, effect, null, null); }
}
